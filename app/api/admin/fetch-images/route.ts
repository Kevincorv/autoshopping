import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";

const DEFAULT_SOURCE = process.env.IMAGE_SOURCE_URL || "https://autoshopping.vercel.app";
const DEFAULT_FROM = 9;
const DEFAULT_TO = 65;
const LIMIT = 12;

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const TRANSLATIONS: Record<string, string> = {
  carpita: "car mat",
  carpitas: "car mats",
  multimedia: "car stereo",
  multimedias: "car stereos",
  suntek: "paint protection film",
  vonixx: "car detailing products",
  sparco: "racing seat",
  volante: "steering wheel",
  pomo: "shift knob",
  cinturon: "seatbelt",
  pedales: "pedals",
  casco: "racing helmet",
  asiento: "car seat",
  parlante: "speaker",
  radio: "car radio",
  camara: "dashcam",
  foco: "headlight",
  lampara: "car lamp",
  bateria: "car battery",
  filtro: "car filter",
  aceite: "motor oil",
  shampoo: "car shampoo",
  cera: "car wax",
  pulidor: "car polish",
  sellador: "car sealant",
  alfombra: "floor mat",
  gps: "gps device",
  alarma: "car alarm",
  cubre: "car cover",
  rueda: "wheel",
  herramienta: "car tool",
  antena: "car antenna",
  freno: "car brake",
  cable: "cable",
  kit: "kit",
  fundas: "seat covers",
};

function translateQuery(name: string): string {
  const q = (name || "").toLowerCase();
  let out = q;
  for (const [es, en] of Object.entries(TRANSLATIONS)) {
    if (q.includes(es)) {
      out = q.replace(es, en);
      break;
    }
  }
  return out.replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
}

async function searchWikimedia(query: string): Promise<string | null> {
  try {
    const translated = translateQuery(query);
    if (!translated) return null;
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(translated)}&srnamespace=6&srlimit=1`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "AutoShoppingBot/1.0 (https://autoshopping.com.py)" },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const hit = data?.query?.search?.[0];
    if (!hit) return null;
    const title = hit.title.replace(/^File:/, "");
    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent("File:" + title)}&prop=imageinfo&iiprop=url&iiurlwidth=600`;
    const infoRes = await fetch(infoUrl, {
      headers: { "User-Agent": "AutoShoppingBot/1.0" },
    });
    const infoData: any = await infoRes.json();
    const pages = infoData?.query?.pages;
    if (!pages) return null;
    const firstKey = Object.keys(pages)[0];
    return pages[firstKey]?.imageinfo?.[0]?.thumburl || pages[firstKey]?.imageinfo?.[0]?.url;
  } catch {
    return null;
  }
}

const FALLBACK_BASES = ["car-accessory", "car-parts", "auto-parts", "automotive", "car-interior"];

function fallbackImage(name: string) {
  const h = hashSeed(name);
  const base = FALLBACK_BASES[h % FALLBACK_BASES.length];
  return `https://loremflickr.com/600/450/${base}?lock=${h}`;
}

async function fetchPage(source: string, page: number): Promise<any[]> {
  const url = `${source.replace(/\/$/, "")}/api/products?page=${page}&limit=${LIMIT}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "AutoShoppingImageBot/1.0", Accept: "application/json" },
      });
      if (!res.ok) {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      const data = await res.json();
      return Array.isArray(data?.products) ? data.products : [];
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  return [];
}

async function ensureRemoteImage(name: string, remoteImage?: string | null): Promise<{ url: string; source: string }> {
  if (remoteImage) return { url: remoteImage, source: "remote" };
  const wiki = await searchWikimedia(name);
  if (wiki) return { url: wiki, source: "wikimedia" };
  return { url: fallbackImage(name), source: "fallback" };
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (session.roleName !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    let body: any = {};
    try { body = await request.json(); } catch {}
    const source = (body.source as string) || DEFAULT_SOURCE;
    const fromPage = parseInt(String(body.fromPage ?? DEFAULT_FROM), 10);
    const toPage = parseInt(String(body.toPage ?? DEFAULT_TO), 10);
    const updateExisting = body.updateExisting === true;
    const importMissing = body.importMissing === true;

    if (!(fromPage >= 1 && toPage >= fromPage)) {
      return NextResponse.json({ error: "Rango de páginas inválido" }, { status: 400 });
    }

    const summary = {
      processed: 0,
      updated: 0,
      imported: 0,
      skipped: 0,
      notFound: 0,
      failed: 0,
      bySource: {} as Record<string, number>,
    };

    let defaultBrand = await prisma.brand.findFirst({ where: { slug: "generales" } });
    if (!defaultBrand) {
      defaultBrand = await prisma.brand.upsert({
        where: { slug: "generales" },
        create: { name: "Generales", slug: "generales" },
        update: {},
      });
    }

    const generalCategory = await prisma.category.findFirst({ where: { slug: "accesorios-varios" } });

    const localBySku = new Map<string, any>();
    const localBySlug = new Map<string, any>();
    const allLocal = await prisma.product.findMany({
      select: { id: true, name: true, slug: true, sku: true },
    });
    for (const p of allLocal) {
      localBySku.set(p.sku, p);
      localBySlug.set(p.slug, p);
    }

    for (let page = fromPage; page <= toPage; page++) {
      const products = await fetchPage(source, page);
      if (!products.length) break;

      for (const p of products) {
        summary.processed += 1;
        try {
          let local = localBySku.get(p.sku) || localBySlug.get(p.slug);

          if (local && !updateExisting) {
            const existingImgs = await prisma.productImage.count({ where: { productId: local.id } });
            if (existingImgs > 0) { summary.skipped += 1; continue; }
          }

          const img = await ensureRemoteImage(p.name || p.slug, Array.isArray(p.images) ? p.images[0] : null);
          summary.bySource[img.source] = (summary.bySource[img.source] || 0) + 1;

          if (!local && importMissing) {
            const slug = (p.slug || ("imported-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8))).toString();
            const sku = (p.sku || "SKU-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()).toString();
            const category = generalCategory || await prisma.category.upsert({
              where: { slug: "accesorios-varios" },
              create: { name: "Accesorios Varios", slug: "accesorios-varios" },
              update: {},
            });
            try {
              const newProd = await prisma.product.create({
                data: {
                  name: (p.name || "Producto importado").toString().slice(0, 200),
                  slug: slug.toString().slice(0, 200),
                  sku: sku.toString().slice(0, 100),
                  brandId: defaultBrand.id,
                  categoryId: category.id,
                  brandName: defaultBrand.name,
                  price: Number(p.price) || 0,
                  comparePrice: Number(p.comparePrice) || null,
                  currency: (p.currency || "PYG").toString(),
                  stock: Number(p.stock) || 0,
                  minStock: 1,
                  unit: (p.unit || "unidad").toString(),
                  description: (p.description || "").toString(),
                  shortDescription: (p.shortDescription || "").toString(),
                  isActive: true,
                  isFeatured: false,
                  isNew: false,
                  sold: 0,
                  images: { create: [{ url: img.url, alt: (p.name || "").toString(), isPrimary: true, sortOrder: 0 }] },
                },
                select: { id: true, slug: true, sku: true },
              });
              localBySlug.set(newProd.slug, newProd);
              localBySku.set(newProd.sku, newProd);
              summary.imported += 1;
            } catch (e: any) {
              summary.failed += 1;
              continue;
            }
            continue;
          }

          if (!local) {
            summary.notFound += 1;
            continue;
          }

          if (!updateExisting) {
            const existingImgs = await prisma.productImage.count({ where: { productId: local.id } });
            if (existingImgs > 0) { summary.skipped += 1; continue; }
          }

          await prisma.productImage.create({
            data: {
              productId: local.id,
              url: img.url,
              alt: (p.name || "").toString().slice(0, 200),
              isPrimary: true,
              sortOrder: 0,
            },
          });
          summary.updated += 1;
        } catch (e: any) {
          summary.failed += 1;
        }
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    return NextResponse.json({ ok: true, summary });
  } catch (error: any) {
    console.error("fetch-images error:", error);
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}
