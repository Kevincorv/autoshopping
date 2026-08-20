import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../lib/prisma";

const SRC = "C:\\Users\\rolon\\Downloads\\message.txt";

type Rec = {
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  buyPrice: number | null;
  salePrice: number | null;
  iva: string;
  status: string;
};

function slugify(s: string): string {
  return s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function parsePrice(s: string | undefined): number | null {
  if (!s) return null;
  const v = s.trim();
  if (!v || v === "—" || v === "None" || v === "-" || v === "") return null;
  const n = Number(
    v.replace(/Gs\.?/gi, "").replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "")
  );
  return Number.isFinite(n) ? n : null;
}

function parseNum(s: string | undefined): number {
  if (!s) return 0;
  const v = s.trim();
  if (!v || v === "—" || v === "None") return 0;
  const n = Number(v.replace(/\./g, "").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parse(): Rec[] {
  const raw = readFileSync(SRC, "utf8");
  const lines = raw.split(/\r?\n/);
  const records: Rec[] = [];
  let pending: { sku: string; name: string } | null = null;

  const pushComplete = (f: string[]) => {
    records.push({
      sku: (f[1] ?? "").trim(),
      name: (f[2] ?? "").trim(),
      category: (f[3] ?? "").trim(),
      unit: (f[4] ?? "").trim(),
      stock: parseNum(f[5]),
      minStock: parseNum(f[6]),
      buyPrice: parsePrice(f[7]),
      salePrice: parsePrice(f[8]),
      iva: (f[10] ?? "").trim(),
      status: (f[11] ?? "").trim(),
    });
  };

  const pushContinuation = (f: string[]) => {
    if (!pending) return;
    const nameCont = f[0] && f[0] !== "None" ? f[0] : "";
    if (nameCont) pending.name += " " + nameCont;
    records.push({
      sku: pending.sku,
      name: pending.name,
      category: (f[1] ?? "").trim(),
      unit: (f[2] ?? "").trim(),
      stock: parseNum(f[3]),
      minStock: parseNum(f[4]),
      buyPrice: parsePrice(f[5]),
      salePrice: parsePrice(f[6]),
      iva: (f[8] ?? "").trim(),
      status: (f[9] ?? "").trim(),
    });
    pending = null;
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^C[oó]digo/i.test(line) || line.includes("Stock actual")) continue; // header
    const f = line.split("\t");
    const startsWithTab = line.startsWith("\t");

    if (startsWithTab) {
      if (pending) pending = null; // orphan, flush
      if (f.length >= 12) {
        pushComplete(f);
      } else if (f.length === 3) {
        pending = { sku: (f[1] ?? "").trim(), name: (f[2] ?? "").trim() };
      } else if (f.length >= 3 && f[1]) {
        pending = { sku: f[1].trim(), name: (f[2] ?? "").trim() };
      }
    } else {
      if (!pending) continue;
      pushContinuation(f);
    }
  }

  return records;
}

async function main() {
  const dry = process.argv.includes("--dry");
  console.log("Parsing", SRC, "...");
  const all = parse();
  // dedupe by sku (last wins)
  const bySku = new Map<string, Rec>();
  let emptySku = 0;
  for (const r of all) {
    if (!r.sku || r.sku === "None") {
      emptySku++;
      continue;
    }
    bySku.set(r.sku, r);
  }
  const records = [...bySku.values()];
  console.log(`Parsed lines -> ${all.length} records | distinct sku: ${records.length} | empty sku skipped: ${emptySku}`);
  if (records.length === 0) throw new Error("No records parsed");
  console.log("Sample[0]:", JSON.stringify(records[0]));
  console.log("Sample[last]:", JSON.stringify(records[records.length - 1]));

  const cats = [...new Set(records.map((r) => r.category).filter(Boolean))];
  console.log(`Distinct categories: ${cats.length} ->`, cats.join(", "));

  if (dry) {
    console.log("DRY RUN — no writes.");
    return;
  }

  // Brand
  let brand = await prisma.brand.findFirst({ where: { slug: "generico" } });
  if (!brand) brand = await prisma.brand.findFirst({ where: { name: "Generico" } });
  if (!brand) {
    brand = await prisma.brand.create({ data: { name: "Generico", slug: "generico", isActive: true } });
    console.log("Created brand:", brand.id);
  } else {
    console.log("Using brand:", brand.id, brand.name);
  }

  // Categories
  const existingCats = await prisma.category.findMany();
  const catMap = new Map<string, { id: string; slug: string }>();
  for (const c of existingCats) catMap.set(c.name.toLowerCase(), { id: c.id, slug: c.slug });
  const usedSlugs = new Set(existingCats.map((c) => c.slug));
  let createdCats = 0;
  for (const name of cats) {
    const key = name.toLowerCase();
    if (catMap.has(key)) continue;
    let slug = slugify(name) || `cat-${Date.now()}`;
    let i = 1;
    while (usedSlugs.has(slug)) {
      slug = `${slugify(name)}-${i++}`;
    }
    usedSlugs.add(slug);
    const c = await prisma.category.create({
      data: { name, slug, isActive: true },
    });
    catMap.set(key, { id: c.id, slug: c.slug });
    createdCats++;
  }
  console.log(`Categories created: ${createdCats} | total: ${catMap.size}`);

  // Existing products by sku
  const existing = await prisma.product.findMany({ select: { sku: true, slug: true } });
  const existingSkus = new Set(existing.map((p) => p.sku));
  const existingSlugs = new Set(existing.map((p) => p.slug));
  console.log(`Existing products: ${existing.length}`);

  const toCreate: any[] = [];
  const toUpdate: Rec[] = [];
  for (const r of records) {
    if (existingSkus.has(r.sku)) toUpdate.push(r);
    else toCreate.push(r);
  }
  console.log(`To create: ${toCreate.length} | to update: ${toUpdate.length}`);

  // Build create payloads with unique slug
  const usedProductSlugs = new Set(existingSlugs);
  const createData = toCreate.map((r) => {
    let slug = `${slugify(r.name)}-${String(r.sku).slice(0, 12)}`.slice(0, 180);
    if (!slug) slug = `p-${r.sku}`;
    let i = 1;
    while (usedProductSlugs.has(slug)) slug = `${slug}-${i++}`.slice(0, 180);
    usedProductSlugs.add(slug);
    const cat = catMap.get(r.category.toLowerCase());
    const iva = r.iva && r.iva !== "—" && r.iva !== "None" ? `IVA: ${r.iva}` : "";
    return {
      name: r.name.slice(0, 190),
      slug,
      brandId: brand!.id,
      categoryId: cat!.id,
      description: iva,
      shortDescription: "",
      sku: r.sku,
      barcode: r.sku,
      price: r.salePrice ?? 0,
      costPrice: r.buyPrice,
      salePrice: r.salePrice,
      currency: "PYG",
      stock: r.stock,
      minStock: Math.max(0, Math.floor(r.minStock)),
      unit: r.unit === "UNI" ? "unidad" : (r.unit || "unidad").toLowerCase(),
      isActive: r.status.toLowerCase() === "activo",
      isFeatured: false,
      isNew: false,
      rating: 0,
      reviews: 0,
      sold: 0,
    };
  });

  // createMany in chunks
  const CHUNK = 200;
  let created = 0;
  for (let i = 0; i < createData.length; i += CHUNK) {
    const chunk = createData.slice(i, i + CHUNK);
    const res = await prisma.product.createMany({ data: chunk, skipDuplicates: true });
    created += res.count;
    process.stdout.write(`\rCreated ${created}/${createData.length} ...`);
  }
  console.log("");

  // Updates (sequential, only essential fields)
  let updated = 0;
  const CONC = 10;
  for (let i = 0; i < toUpdate.length; i += CONC) {
    const batch = toUpdate.slice(i, i + CONC);
    await Promise.all(
      batch.map((r) => {
        const cat = catMap.get(r.category.toLowerCase());
        return prisma.product
          .update({
            where: { sku: r.sku },
            data: {
              name: r.name.slice(0, 190),
              categoryId: cat ? cat.id : undefined,
              price: r.salePrice ?? 0,
              costPrice: r.buyPrice,
              salePrice: r.salePrice,
              stock: r.stock,
              minStock: Math.max(0, Math.floor(r.minStock)),
              unit: r.unit === "UNI" ? "unidad" : (r.unit || "unidad").toLowerCase(),
              isActive: r.status.toLowerCase() === "activo",
            },
          })
          .then(() => updated++)
          .catch((e) => console.log(`\nUpdate err sku=${r.sku}: ${e.message}`));
      })
    );
    process.stdout.write(`\rUpdated ${updated}/${toUpdate.length} ...`);
  }
  console.log("");

  const total = await prisma.product.count();
  console.log(`DONE. Products in DB now: ${total}`);
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
