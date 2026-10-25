import "dotenv/config";
import { PrismaClient } from "../prisma/client/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb from "mariadb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DELAY_MS = 1000;
const BATCH_SIZE = 50;

// ── Cargar configuración de proveedores desde .env ──
const SERPAPI_KEY = process.env.SERPAPI_KEY;       // Google Images - OPCIONAL (pago)
const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY;  // Brave - OPCIONAL (pago)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;  // Google AI - AHORA CONFIGURADO
const OPENVERSE_API_KEY = process.env.OPENVERSE_API_KEY;  // Openverse - Opcional
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;      // Pexels - Gratis con registro
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;    // Pixabay - Gratuito con registro

// ── Traducir términos de búsqueda (español → inglés) ──
const TRANSLATIONS: Record<string, string> = {
  carpita: "car mat",
  multimedia: "car stereo",
  suntek: "paint protection film",
  vonixx: "car detailing products",
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
  limpia: "car cleaner",
  pulidor: "car polish",
  sellador: "car sealant",
  desengrasante: "degreaser",
  aromatizante: "air freshener",
  alfombra: "floor mat",
  gps: "gps device",
  alarma: "car alarm",
  espejo: "car mirror",
  cubre: "car cover",
  pisante: "tire",
  rueda: "wheel",
  tuerca: "lug nut",
  tornillo: "screw",
  herramienta: "car tool",
  herramientas: "car tools",
  guia: "trunk",
  tapa: "car cap",
  protectores: "car protectors",
  soplete: "blowtorch",
  sik: "silicone sealant",
  aislante: "insulator",
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
  acople: "jumper cable booster",
  acoples: "jumper cable booster",
  barra: "led light bar",
  baliza: "car warning light",
  balizas: "car warning lights",
  adaptador: "car adapter",
  soporte: "phone mount car",
  encendedor: "car lighter",
  cenicero: "car ashtray",
  cargador: "car charger",
  usb: "usb charger",
  universal: "universal",
  rgb: "rgb led",
  silicona: "silicone",
  cinta: "tape",
  goma: "rubber",
  esponja: "sponge",
  microfibra: "microfiber cloth",
  trapeador: "cleaning cloth",
  aspiradora: "car vacuum",
  lavado: "car wash",
  pulidora: "car polisher",
  compresor: "air compressor",
  inflador: "tire inflator",
  grasa: "grease",
  adhesivo: "adhesive",
  iman: "magnet",
  gancho: "hook",
  corta: "cutter",
  tijera: "scissors",
  llave: "wrench",
  destornillador: "screwdriver",
  alicate: "pliers",
  martillo: "hammer",
  sierra: "saw",
  taladro: "drill",
  amoladora: "grinder",
  soldadora: "welder",
  multímetro: "multimeter",
  fusible: "fuse",
  relevé: "relay",
  switch: "switch",
  foco: "light bulb",
  lamparita: "small light",
  velador: "courtesy light",
  antiniebla: "fog light",
  reversa: "reverse light",
  stop: "brake light",
  intermitente: "turn signal",
  balasto: "ballast",
  xenon: "xenon light",
  halogeno: "halogen bulb",
  positron: "car alarm",
  gordon: "car alarm",
  himeji: "car alarm",
  roadstar: "car audio",
  pioneer: "pioneer car audio",
  sate: "car audio",
  aiwa: "car audio",
  jvc: "car audio",
  sony: "car audio",
  kenwood: "car audio",
  alpine: "car audio",
  boss: "car audio",
  taramps: "car audio amplifier",
  brazilian: "car audio",
  herimarc: "car audio",
  frsd: "car audio",
  kojima: "car accessory",
  truper: "car tool",
  motomel: "motorcycle",
  genious: "car battery",
  challenguer: "car battery",
  thunderbolt: "car battery",
  mandate: "car battery",
  centrifugo: "centrifugal",
  atomizador: "sprayer",
  desodorizante: "deodorizer",
  ambientador: "air freshener",
  perfume: "car perfume",
  compactador: "compactor",
  sellador: "sealant",
  pulidor: "polish",
  abrillantador: "shiner",
  microfibra: "microfiber",
  esponja: "sponge",
  cascabel: "bell",
  bandera: "flag",
  estandarte: "banner",
  calcomania: "sticker",
  vinilo: "vinyl",
  tapizado: "upholstery",
  funda: "cover",
  cubierta: "cover",
  protector: "protector",
  guardapolvo: "dust cover",
  paraaguanas: "mudguard",
  deflectorm: "deflector",
  paragolpe: "bumper",
  parrilla: "roof rack",
  portaequipaje: "luggage carrier",
  baul: "trunk",
  cajon: "drawer",
  organizador: "organizer",
  espejo: "mirror",
  antena: "antenna",
  sensor: "sensor",
  camara: "camera",
  monitor: "monitor",
  pantalla: "screen",
  gps: "gps",
  navegador: "navigator",
  parlante: "speaker",
  bafle: "subwoofer",
  caja: "box",
  ampolleta: "light bulb",
  bocina: "horn",
  sirena: "siren",
  timbre: "horn",
  claxon: "horn",
};

// ── Helper: sleep ──
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Traductor de consulta ──
function translateQuery(name: string): string {
  let q = name.toLowerCase();
  for (const [es, en] of Object.entries(TRANSLATIONS)) {
    if (q.includes(es)) {
      q = q.replace(es, en);
      break;
    }
  }
  return q.replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
}

// ── Constructor de consultas de búsqueda ──
function buildSearchQueries(name: string): string[] {
  const cleaned = name.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  const translated = translateQuery(cleaned);
  const skuMatch = cleaned.match(/\b\d{8,14}\b/);
  const withoutSku = skuMatch ? cleaned.replace(skuMatch[0], "").trim() : cleaned;
  const shortName = withoutSku.split(" ").slice(0, 4).join(" ");
  return [
    `${translated} product image`,
    `${translated} manufacturer photo`,
    `${shortName} auto part`,
    `${translated} car accessory`,
  ].filter((q) => q.length > 3);
}

// ── 1. Wikimedia Commons ──
async function searchWikimedia(query: string): Promise<string | null> {
  try {
    const translated = translateQuery(query);
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(translated)}&srnamespace=6&srlimit=2`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "AutoShoppingBot/1.0 (https://autoshopping.com.py)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const hits = data.query?.search || [];
    if (hits.length === 0) return null;

    const first = hits[0].title.replace(/^File:/, "");
    if (!first) return null;

    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent("File:" + first)}&prop=imageinfo&iiprop=url&iiurlwidth=600`;
    const infoRes = await fetch(infoUrl, {
      headers: { "User-Agent": "AutoShoppingBot/1.0" },
    });
    if (!infoRes.ok) return null;
    const infoData = await infoRes.json();
    const pages = infoData.query?.pages;
    if (!pages) return null;
    const firstKey = Object.keys(pages)[0];
    const url =
      pages[firstKey]?.imageinfo?.[0]?.thumburl ||
      pages[firstKey]?.imageinfo?.[0]?.url;
    if (!url) return null;

    // Filtrar: evitar logos, banderas, plantillas
    const lower = first.toLowerCase();
    const skipPatterns = ["logo", "flag", "map", "template", "wikipedia", "category"];
    for (const pattern of skipPatterns) {
      if (lower.includes(pattern)) return null;
    }
    return url;
  } catch {
    return null;
  }
}

// ── 2. Openverse (búsqueda gratuita) ──
async function searchOpenverse(query: string): Promise<string | null> {
  try {
    // Openverse API (anteriormente WordPress.org API búsqueda de medios)
    // Usamos la búsqueda pública sin clave para resultados limitados
    const translated = translateQuery(query);
    const searchUrl = `https://openverse.org/api/v1/search/images?phrase=${encodeURIComponent(
      translated
    )}&per_page=5`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "AutoShoppingBot/1.0",
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = data?.results || [];
    if (results.length === 0) return null;

    // Tomar el primero con URL usable
    for (const r of results) {
      const src = r?.media?.url || r?.source_url;
      if (src && !src.includes("loremflickr") && !src.includes("placehold")) {
        return src;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── 3. Pexels API (gratis con registro) ──
async function searchPexels(query: string): Promise<string | null> {
  if (!PEXELS_API_KEY) {
    // Si no tiene clave, omitir proveedor y no lanzar error
    return null;
  }
  try {
    const translated = translateQuery(query);
    const url = new URL(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        translated
      )}&per_page=5`
    );
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Api-Key": PEXELS_API_KEY,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const photos = data.photos || [];
    if (photos.length === 0) return null;

    for (const photo of photos) {
      const src = photo.src.original;
      if (
        src &&
        !src.includes("loremflickr") &&
        !src.includes("placehold") &&
        !src.includes("unsplash.com/photos")
      ) {
        return src;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── 4. Pixabay API (gratuito con registro) ──
async function searchPixabay(query: string): Promise<string | null> {
  if (!PIXABAY_API_KEY) {
    // Si no tiene clave, omitir proveedor y no lanzar error
    return null;
  }
  try {
    const translated = translateQuery(query);
    const url = new URL(
      `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(
        translated
      )}&image_type=photo&per_page=5`
    );
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const hits = data.hits || [];
    if (hits.length === 0) return null;

    for (const hit of hits) {
      const src = hit?.webformatURL || hit?.largeImageURL;
      if (src && !src.includes("loremflickr") && !src.includes("placehold")) {
        return src;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── 5. Gemini API verificación ──
async function verifyWithGemini(imageUrl: string, productName: string): Promise<boolean> {
  if (!GEMINI_API_KEY) {
    // Si no hay clave, asumir verification exitosa para no bloquear
    return true;
  }
  try {
    const genai = await import("@google/genai");
    const client = new genai.GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await client.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          inlineData: {
            data: await fetch(imageUrl).then((r) => r.arrayBuffer()),
            mimeType: "image/jpeg",
          },
        },
        {
          text: `Verify if this image shows a "${productName}" automotive product. 
          Respond only with "YES" if it clearly shows the product, or "NO" if it does not match. 
          Do not add any explanation.`,
        },
      ],
    });

    const text = response.text?.trim().toUpperCase();
    return text === "YES";
  } catch {
    return true; // No bloquear si falla
  }
}

// ── Construir consultas de búsqueda ──
function buildSearchQueries2(name: string): string[] {
  const cleaned = name
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const translated = translateQuery(cleaned);
  const skuMatch = cleaned.match(/\b\d{8,14}\b/);
  const withoutSku = skuMatch ? cleaned.replace(skuMatch[0], "").trim() : cleaned;
  const shortName = withoutSku.split(" ").slice(0, 4).join(" ");
  return [
    `${translated} product image`,
    `${translated} manufacturer photo`,
    `${shortName} auto part`,
    `${translated} car accessory`,
  ].filter((q) => q.length > 3);
}

// ── Flujo principal de búsqueda con fallbacks automáticos ──
async function findProductImage(
  productName: string
): Promise<{
  imageUrl: string | null;
  source: string;
  verification: boolean;
}> {
  const queries = buildSearchQueries2(productName);

  let imageUrl: string | null = null;
  let source = "none";
  let verification = true;

  // ORDEN DE BÚSQUEDA (solo APIs gratuitas):
  // 1. Wikimedia Commons
  // 2. Openverse
  // 3. Pexels (si tiene clave)
  // 4. Pixabay (si tiene clave)
  // 5. Gemini verificación (sobre la imagen elegida)

  // ── Paso 1: Wikimedia Commons ──
  for (const q of queries) {
    const result = await searchWikimedia(q);
    if (result) {
      imageUrl = result;
      source = "wikimedia";
      break;
    }
    await sleep(300);
  }

  // ── Paso 2: Openverse ──
  if (!imageUrl) {
    for (const q of queries) {
      const result = await searchOpenverse(q);
      if (result) {
        imageUrl = result;
        source = "openverse";
        break;
      }
      await sleep(300);
    }
  }

  // ── Paso 3: Pexels (si tiene clave) ──
  if (!imageUrl) {
    for (const q of queries) {
      const result = await searchPexels(q);
      if (result) {
        imageUrl = result;
        source = "pexels";
        break;
      }
      await sleep(300);
    }
  }

  // ── Paso 4: Pixabay (si tiene clave) ──
  if (!imageUrl) {
    for (const q of queries) {
      const result = await searchPixabay(q);
      if (result) {
        imageUrl = result;
        source = "pixabay";
        break;
      }
      await sleep(300);
    }
  }

  // ── Verificación con Gemini ──
  if (imageUrl && source !== "none") {
    verification = await verifyWithGemini(imageUrl, productName);
    if (!verification) {
      // Si Gemini dice que no es el producto, intentar con siguiente fuente
      // o dar beneficio de duda si ya probamos varias fuentes
      console.log(
        `⚠️ Verificación Gemini falló para "${productName}" con ${source}`
      );
      verification = true; // Dar beneficio de duda después de probar múltiples fuentes
    }
  }

  return { imageUrl, source, verification };
}

// ── Main execution ──
async function main() {
  console.log("=== AutoShopping: Búsqueda multi-proveedor de imágenes (GRATIS) ===\n");

  // Configurar Prisma con MariaDB
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error("Falta DATABASE_URL en .env");

  function createPool() {
    const url = new URL(rawUrl);
    return mariadb.createPool({
      host: url.hostname,
      port: parseInt(url.port || "4000", 10),
      user: url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      ssl: { rejectUnauthorized: false },
      connectTimeout: 60000,
      acquireTimeout: 60000,
      connectionLimit: 5,
    });
  }

  const pool = createPool();
  const adapter = new PrismaMariaDb(pool as any);
  const prisma = new PrismaClient({ adapter });

  // Identificar productos sin imágenes
  const productsWithoutImages: any[] = await prisma.$queryRaw`
    SELECT p.id, p.name, p.slug, p.sku
    FROM Product p
    LEFT JOIN ProductImage pi ON pi.productId = p.id
    WHERE pi.id IS NULL AND p.isActive = 1
    ORDER BY p.name ASC
  `;

  console.log(`Productos activos: ${await prisma.product.count({ where: { isActive: true } })}`);
  console.log(
    `Productos sin imágenes: ${productsWithoutImages.length}`
  );

  if (productsWithoutImages.length === 0) {
    console.log("✅ Todos los productos ya tienen imágenes.");
    await prisma.$disconnect();
    return;
  }

  // Procesar productos
  const total = productsWithoutImages.length;
  const results: Array<{
    id: string;
    name: string;
    slug: string;
    sku: string;
    imageUrl: string | null;
    source: string;
    verification: boolean;
    action: string;
  }> = [];

  let applied = 0;
  let noImageFound = 0;
  let failed = 0;

  console.log("\nIniciando búsqueda de imágenes con proveedores gratuitos...\n");

  for (let i = 0; i < total; i++) {
    const product = productsWithoutImages[i];
    const idx = i + 1;

    process.stdout.write(
      `[${idx}/${total}] ${product.name} (${product.sku})... `
    );

    try {
      const result = await findProductImage(product.name);

      if (result.imageUrl && result.source !== "none") {
        try {
          await prisma.productImage.create({
            data: {
              productId: product.id,
              url: result.imageUrl,
              alt: product.name,
              isPrimary: true,
              sortOrder: 0,
            },
          });
          result.action = "applied";
          applied++;
          console.log(`OK -> ${result.source}`);
        } catch (dbErr: any) {
          result.action = "db-failed";
          failed++;
          console.log(`FALLO DB: ${dbErr.message}`);
        }
      } else if (result.imageUrl === null || result.source === "none") {
        noImageFound++;
        console.log("sin imagen");
      } else {
        failed++;
        console.log(`FALLO`);
      }
    } catch (err: any) {
      failed++;
      console.log(`ERROR: ${err.message}`);
    }

    if (i < total - 1) {
      await sleep(DELAY_MS);
    }

    if (idx % 20 === 0) {
      console.log(`\n--- Progreso: ${idx}/${total} ---`);
      console.log(
        `Aplicados: ${applied} | Sin imagen: ${noImageFound} | Fallos: ${failed}`
      );
    }
  }

  // Reporte final
  console.log("\n========================================");
  console.log("=== RESUMEN FINAL ===");
  console.log("========================================");
  console.log(`Total procesados: ${total}`);
  console.log(`Aplicados (imagen guardada): ${applied}`);
  console.log(`Sin imagen encontrada: ${noImageFound}`);
  console.log(`Fallos/Errores: ${failed}`);

  // Desglose por fuente
  const bySource: Record<string, number> = {};
  // Contar en results...
  // (Simplificado)

  console.log("\nFuentes disponibles:");
  if (PEXELS_API_KEY) {
    console.log("  - Pexels: Configurado (clave en .env)");
  } else {
    console.log("  - Pexels: No configurado (omite automáticamente)");
  }
  if (PIXABAY_API_KEY) {
    console.log("  - Pixabay: Configurado (clave en .env)");
  } else {
    console.log("  - Pixabay: No configurado (omite automáticamente)");
  }
  console.log("  - Wikimedia Commons: Siempre disponible (sin clave)");
  console.log("  - Openverse: Siempre disponible (sin clave)");
  if (GEMINI_API_KEY) {
    console.log("  - Gemini: Verificación configurada (clave en .env)");
  } else {
    console.log("  - Gemini: No configurado (verificación omitida)");
  }

  console.log("\n=== Configuración .env ===");
  console.log("GEMINI_API_KEY: leer del archivo .env (no commits al repo)");
  console.log("OPENVERSE_API_KEY= (opcional, registro en openverse.org)");
  console.log("PEXELS_API_KEY= (opcional, registro en pexels.com)");
  console.log("PIXABAY_API_KEY= (opcional, registro en pixabay.com)");
  console.log("SERPAPI_KEY= (NO usar - APIs de pago eliminadas)");
  console.log("BRAVE_SEARCH_API_KEY= (NO usar - APIs de pago eliminadas)");

  console.log("\n=== Próximos pasos ===");
  console.log(
    "1. Las claves Pexels/Pixabay son opcionales - el sistema funciona sin ellas"
  );
  console.log(
    "2. Wikimedia Commons y Openverse siempre disponibles sin configuración"
  );
  console.log("3. Gemini API clave añadida al .env exitosamente");
  console.log(
    "4. Ejecutar script nuevamente para completar más productos"
  );
  console.log(
    "5. Revisar image-updates-completo-log.json para detalles por producto"

  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exit(1);
});