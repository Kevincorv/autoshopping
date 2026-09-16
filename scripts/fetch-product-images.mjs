import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));

const SOURCE = (args.source || process.env.SOURCE_URL || "https://autoshopping.vercel.app").replace(/\/$/, "");
const FROM_PAGE = parseInt(args.from || process.env.FROM_PAGE || "9", 10);
const TO_PAGE = parseInt(args.to || process.env.TO_PAGE || "65", 10);
const LIMIT = 12;
const DB_URL = sanitizeLibsqlUrl(process.env.DATABASE_URL || "file:./dev.db");
const DRY_RUN = args.dry === "1" || args.dry === "true";
const APPLY = args.apply === "1" || args.apply === "true";
const CONCURRENCY = Math.max(1, parseInt(args.concurrency || "3", 10));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = "1";
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

const SUPPORTED_QUERY_KEYS = new Set(["tls", "authToken", "cache"]);

function sanitizeLibsqlUrl(rawUrl) {
  if (!rawUrl || !rawUrl.includes("?")) return rawUrl;
  const qIdx = rawUrl.indexOf("?");
  const hashIdx = rawUrl.indexOf("#", qIdx);
  const queryEnd = hashIdx === -1 ? rawUrl.length : hashIdx;
  const queryStr = rawUrl.substring(qIdx + 1, queryEnd);
  const tail = hashIdx === -1 ? "" : rawUrl.substring(hashIdx);
  const kept = [];
  for (const pair of queryStr.split("&")) {
    if (!pair) continue;
    const key = pair.split("=")[0];
    if (SUPPORTED_QUERY_KEYS.has(key)) kept.push(pair);
  }
  return kept.length
    ? rawUrl.substring(0, qIdx + 1) + kept.join("&") + tail
    : rawUrl.substring(0, qIdx) + tail;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hashSeed(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const TRANSLATIONS = {
  carpita: "car mat",
  carpitas: "car mats",
  multimedia: "car stereo",
  multimedias: "car stereos",
  suntek: "paint protection film",
  vonixx: "car detailing products",
  sparco: "racing seat",
  llanta: "car wheel",
  llantas: "car wheels",
  volante: "steering wheel",
  pomo: "shift knob",
  cinturon: "seatbelt",
  pedales: "pedals",
  casco: "racing helmet",
  asiento: "car seat",
  pincel: "brush",
  parlante: "loudspeaker",
  bocina: "speaker",
  radio: "car radio",
  audio: "car audio",
  camara: "dashcam",
  foco: "headlight",
  luz: "car light",
  luces: "car lights",
  lampara: "car lamp",
  led: "led bulb",
  bateria: "car battery",
  alternador: "alternator",
  arrancador: "starter",
  inyector: "fuel injector",
  filtro: "car filter",
  aceite: "motor oil",
  shampoo: "car shampoo",
  cera: "car wax",
  shampoo: "car shampoo",
  limpia: "car cleaner",
  pulidor: "car polish",
  sellador: "car sealant",
  desengrasante: "degreaser",
  aromatizante: "air freshener",
  alfombra: "floor mat",
  gps: "gps device",
  alarma: "car alarm",
  alarma: "car alarm",
  espejo: "car mirror",
  cubre: "car cover",
  pisante: "tire",
  rueda: "wheel",
  tuerca: "lug nut",
  tornillo: "screw",
  cinturon: "seatbelt",
  herramienta: "car tool",
  herramientas: "car tools",
  guia: "trunk",
  tapa: "car cap",
  protectores: "car protectors",
  protectores: "car protectors",
  soplete: "blowtorch",
  sik: "silicone sealant",
  aislante: "insulator",
  aislante: "insulator",
  pico: "fuel nozzle",
  pico: "fuel nozzle",
  dispositivo: "device",
  kit: "kit",
  fundas: "seat covers",
  retrovisor: "rearview mirror",
  interior: "interior",
  exterior: "exterior",
  antena: "car antenna",
  freno: "car brake",
  pastilla: "brake pad",
  discos: "brake discs",
  amortiguador: "shock absorber",
  cable: "cable",
  bujia: "spark plug",
};

function translateQuery(name) {
  let q = (name || "").toLowerCase();
  let out = q;
  for (const [es, en] of Object.entries(TRANSLATIONS)) {
    if (q.includes(es)) {
      out = q.replace(es, en);
      break;
    }
  }
  return out.replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
}

async function searchWikimedia(query) {
  try {
    const translated = translateQuery(query);
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(translated)}&srnamespace=6&srlimit=1`;
    const res = await fetch(searchUrl, { headers: { "User-Agent": "AutoShoppingBot/1.0 (https://autoshopping.com.py)" } });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.query?.search?.[0];
    if (!hit) {
      const search2 = await fetch(`${searchUrl}&srlimit=1`, { headers: { "User-Agent": "AutoShoppingBot/1.0 (https://autoshopping.com.py)" } });
      const data2 = await search2.json();
      const title = data2?.query?.search?.[0]?.title?.replace(/^File:/, "");
      if (!title) return null;
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent("File:" + title)}&prop=imageinfo&iiprop=url&iiurlwidth=600`;
      const infoRes = await fetch(infoUrl, { headers: { "User-Agent": "AutoShoppingBot/1.0" } });
      const infoData = await infoRes.json();
      const pages = infoData?.query?.pages;
      if (!pages) return null;
      const firstKey = Object.keys(pages)[0];
      return pages[firstKey]?.imageinfo?.[0]?.thumburl || pages[firstKey]?.imageinfo?.[0]?.url;
    }
    const title = hit.title.replace(/^File:/, "");
    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent("File:" + title)}&prop=imageinfo&iiprop=url&iiurlwidth=600`;
    const infoRes = await fetch(infoUrl, { headers: { "User-Agent": "AutoShoppingBot/1.0" } });
    const infoData = await infoRes.json();
    const pages = infoData?.query?.pages;
    if (!pages) return null;
    const firstKey = Object.keys(pages)[0];
    return pages[firstKey]?.imageinfo?.[0]?.thumburl || pages[firstKey]?.imageinfo?.[0]?.url;
  } catch (e) {
    return null;
  }
}

const FALLBACK_BASES = [
  "car-accessory",
  "car-parts",
  "auto-parts",
  "automotive",
  "car-interior",
];

function fallbackImage(name) {
  const h = hashSeed(name);
  const base = FALLBACK_BASES[h % FALLBACK_BASES.length];
  return `https://loremflickr.com/600/450/${base}?lock=${h}`;
}

async function fetchPage(page) {
  const url = `${SOURCE}/api/products?page=${page}&limit=${LIMIT}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "AutoShoppingImageBot/1.0 (+fetch-images)",
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        console.warn(`  HTTP ${res.status} page=${page}, reintento ${attempt + 1}/3`);
        await sleep(800 * (attempt + 1));
        continue;
      }
      const data = await res.json();
      return data.products || [];
    } catch (e) {
      console.warn(`  Error page=${page} intento ${attempt + 1}/3: ${e.message}`);
      await sleep(800 * (attempt + 1));
    }
  }
  return [];
}

async function processProduct(p, localCache, db) {
  const localProduct = localCache.bySku.get(p.sku)
    || localCache.bySlug.get(p.slug)
    || localCache.byName.get((p.name || "").toLowerCase().trim());

  if (localProduct) {
    if (localCache.withImages.has(localProduct.id)) {
      return { sku: p.sku, slug: p.slug, name: p.name, action: "skipped-already-has-images" };
    }
  }

  let imageUrl = Array.isArray(p.images) && p.images.length ? p.images[0] : null;
  let source = "remote";

  if (!imageUrl) {
    imageUrl = await searchWikimedia(p.name);
    source = imageUrl ? "wikimedia" : null;
  }

  if (!imageUrl) {
    imageUrl = fallbackImage(p.name);
    source = "fallback";
  }

  if (!localProduct) {
    return { sku: p.sku, slug: p.slug, name: p.name, url: imageUrl, source, action: "no-local-match" };
  }

  if (APPLY && !DRY_RUN) {
    try {
      const imageId = randomUUID().replace(/-/g, "").slice(0, 25);
      await db.execute({
        sql: `INSERT INTO ProductImage (id, productId, url, alt, isPrimary, sortOrder, createdAt)
              VALUES (?, ?, ?, ?, 1, 0, ?)`,
        args: [imageId, localProduct.id, imageUrl, p.name || "", new Date().toISOString()],
      });
      return { sku: p.sku, slug: p.slug, name: p.name, url: imageUrl, source, localId: localProduct.id, action: "applied" };
    } catch (e) {
      return { sku: p.sku, slug: p.slug, name: p.name, url: imageUrl, error: e.message, action: "failed" };
    }
  }

  return { sku: p.sku, slug: p.slug, name: p.name, url: imageUrl, source, localId: localProduct.id, action: "would-apply" };
}

async function main() {
  console.log(`Source: ${SOURCE}`);
  console.log(`Rango: páginas ${FROM_PAGE} a ${TO_PAGE}, lote ${LIMIT}`);
  console.log(`Modo: ${DRY_RUN ? "DRY-RUN" : APPLY ? "APLICAR" : "preview"}`);

  const db = createClient({ url: DB_URL });
  const updateLog = [];

  try {
    const localProducts = await db.execute({
      sql: "SELECT id, name, slug, sku FROM Product",
    });
    const localImages = await db.execute({
      sql: "SELECT productId, COUNT(*) as c FROM ProductImage GROUP BY productId",
    });

    const withImages = new Map();
    for (const row of localImages.rows) withImages.set(row.productId, row.c > 0);

    const byName = new Map();
    const bySlug = new Map();
    const bySku = new Map();
    for (const row of localProducts.rows) {
      byName.set(row.name.toLowerCase().trim(), row);
      bySlug.set(row.slug, row);
      bySku.set(row.sku, row);
    }
    const localCache = { byName, bySlug, bySku, withImages };

    console.log(`Productos locales en DB: ${localProducts.rows.length}`);
    console.log(`Con imágenes cargadas:    ${withImages.size}\n`);

    let totalProcessed = 0;
    let totalApplied = 0;
    let totalWouldApply = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let totalNoMatch = 0;

    for (let page = FROM_PAGE; page <= TO_PAGE; page++) {
      process.stdout.write(`Página ${page}/${TO_PAGE}... `);
      const products = await fetchPage(page);
      if (!products.length) {
        console.log(" sin resultados, fin del listado.");
        break;
      }
      console.log(` ${products.length} productos`);

      let cursor = 0;
      const results = new Array(products.length);
      const worker = async () => {
        while (cursor < products.length) {
          const idx = cursor++;
          const p = products[idx];
          results[idx] = await processProduct(p, localCache, db);
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
      updateLog.push(...results);

      for (const r of results) {
        totalProcessed += 1;
        if (r.action === "applied") totalApplied += 1;
        else if (r.action === "would-apply") totalWouldApply += 1;
        else if (r.action === "skipped-already-has-images") totalSkipped += 1;
        else if (r.action === "no-local-match") totalNoMatch += 1;
        else if (r.action === "failed") totalFailed += 1;
      }

      await sleep(120);
    }

    console.log("\n=== Resumen ===");
    console.log(`Procesados: ${totalProcessed}`);
    console.log(`Aplicados:  ${totalApplied}`);
    console.log(`Pendientes: ${totalWouldApply}`);
    console.log(`Saltados:   ${totalSkipped}`);
    console.log(`Sin match:  ${totalNoMatch}`);
    console.log(`Fallos:     ${totalFailed}`);

    const bySource = {};
    for (const r of updateLog) {
      if (r.source) bySource[r.source] = (bySource[r.source] || 0) + 1;
    }
    console.log("\nFuente de imágenes:");
    for (const [k, v] of Object.entries(bySource)) console.log(`  ${k}: ${v}`);
  } finally {
    await db.close();
  }

  const out = path.join(__dirname, "image-fetches.json");
  fs.writeFileSync(out, JSON.stringify(updateLog, null, 2));
  console.log(`\nLog: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
