import "dotenv/config";
import { PrismaClient } from "../prisma/client/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb from "mariadb";
import { imageSearch } from "@mudbill/duckduckgo-images-api";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PER_PAGE = 100;
const DELAY_MS = 1500;
const START_PAGE = 6;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const TRANSLATIONS: Record<string, string> = {
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
  abrillantador: "shiner",
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
  sensor: "sensor",
  monitor: "monitor",
  pantalla: "screen",
  navegador: "navigator",
  bafle: "subwoofer",
  caja: "box",
  ampolleta: "light bulb",
  sirena: "siren",
  timbre: "horn",
  claxon: "horn",
};

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const FALLBACK_CATEGORIES = [
  "car-accessory",
  "car-parts",
  "auto-parts",
  "automotive",
  "car-interior",
];

function fallbackImage(name: string): string {
  const h = hashSeed(name);
  const cat = FALLBACK_CATEGORIES[h % FALLBACK_CATEGORIES.length];
  return `https://loremflickr.com/600/450/${cat}?lock=${h}`;
}

function translateQuery(name: string): string {
  let q = name.toLowerCase();
  let out = q;
  for (const [es, en] of Object.entries(TRANSLATIONS)) {
    if (q.includes(es)) {
      out = q.replace(es, en);
      break;
    }
  }
  return out.replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
}

function buildSearchQueries(name: string): string[] {
  const cleaned = name
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const translated = translateQuery(cleaned);

  const skuMatch = cleaned.match(/\b\d{8,14}\b/);
  const withoutSku = skuMatch ? cleaned.replace(skuMatch[0], "").trim() : cleaned;
  const shortName = withoutSku.split(" ").slice(0, 4).join(" ");

  return [translated, shortName, `${shortName} auto`].filter(
    (q, i, arr) => q.length > 2 && arr.indexOf(q) === i
  );
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("Falta DATABASE_URL en .env");

function createPool() {
  try {
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
  } catch {
    return mariadb.createPool(rawUrl);
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  mariadbPool: ReturnType<typeof mariadb.createPool>;
};

const pool = globalForPrisma.mariadbPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForPrisma.mariadbPool = pool;

const adapter = new PrismaMariaDb(pool as any);
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

interface ProductWithoutImages {
  id: string;
  name: string;
  slug: string;
  sku: string;
}

async function findProductsWithoutImages(offset: number, limit: number): Promise<ProductWithoutImages[]> {
  const products = await prisma.$queryRaw<{ id: string; name: string; slug: string; sku: string }[]>`
    SELECT p.id, p.name, p.slug, p.sku
    FROM Product p
    LEFT JOIN ProductImage pi ON pi.productId = p.id
    WHERE pi.id IS NULL AND p.isActive = 1
    ORDER BY p.name ASC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return products;
}

async function searchImage(query: string): Promise<string | null> {
  try {
    const results = await imageSearch({
      query,
      safe: true,
      retries: 2,
      iterations: 1,
    });
    if (results.length > 0) {
      return results[0].image;
    }
    return null;
  } catch {
    return null;
  }
}

interface UpdateResult {
  name: string;
  slug: string;
  sku: string;
  imageUrl: string | null;
  source: string;
  action: string;
  error?: string;
}

async function processProduct(
  product: ProductWithoutImages
): Promise<UpdateResult> {
  const queries = buildSearchQueries(product.name);
  let imageUrl: string | null = null;
  let source = "none";

  for (const q of queries) {
    imageUrl = await searchImage(q);
    if (imageUrl) {
      source = "duckduckgo";
      break;
    }
    await sleep(800);
  }

  if (!imageUrl) {
    imageUrl = fallbackImage(product.name);
    source = "fallback";
  }

  try {
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: imageUrl,
        alt: product.name,
        isPrimary: true,
        sortOrder: 0,
      },
    });
    return {
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      imageUrl,
      source,
      action: "applied",
    };
  } catch (e: any) {
    return {
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      imageUrl,
      source,
      action: "failed",
      error: e.message,
    };
  }
}

async function main() {
  console.log("=== Carga automática de imágenes (Página 6 en adelante) ===");
  console.log(`Página inicial: ${START_PAGE}`);
  console.log(`Productos por página: ${PER_PAGE}`);
  console.log("");

  let currentPage = START_PAGE;
  let totalProcessed = 0;
  let totalApplied = 0;
  let totalFailed = 0;
  const allResults: UpdateResult[] = [];

  while (true) {
    const offset = (currentPage - 1) * PER_PAGE;
    console.log(`\n--- Página ${currentPage} (offset: ${offset}) ---`);

    const products = await findProductsWithoutImages(offset, PER_PAGE);
    console.log(`Productos sin imágenes: ${products.length}`);

    if (products.length === 0) {
      console.log("No hay más productos sin imágenes. ¡Proceso completado!");
      break;
    }

    console.log(`Procesando ${products.length} productos...\n`);

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      process.stdout.write(
        `[P${currentPage}][${i + 1}/${products.length}] ${p.name} (${p.sku})... `
      );

      const result = await processProduct(p);
      allResults.push(result);

      if (result.action === "applied") {
        console.log(`OK -> ${result.imageUrl}`);
        totalApplied++;
      } else if (result.action === "failed") {
        console.log(`FALLO: ${result.error}`);
        totalFailed++;
      } else {
        console.log(`OK -> ${result.imageUrl}`);
        totalApplied++;
      }

      totalProcessed++;

      if (i < products.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    console.log(`\nPágina ${currentPage} completada.`);
    currentPage++;

    // Pausa entre páginas
    await sleep(2000);
  }

  console.log("\n========================================");
  console.log("=== RESUMEN FINAL ===");
  console.log("========================================");
  console.log(`Total procesados: ${totalProcessed}`);
  console.log(`Aplicados:        ${totalApplied}`);
  console.log(`Fallos:           ${totalFailed}`);
  console.log(`Páginas procesadas: ${currentPage - START_PAGE}`);

  if (totalFailed > 0) {
    console.log("\nFallos:");
    const failed = allResults.filter((r) => r.action === "failed");
    for (const f of failed) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
  }

  const logPath = path.join(__dirname, "image-updates-automatico.json");
  fs.writeFileSync(logPath, JSON.stringify(allResults, null, 2));
  console.log(`\nLog guardado: ${logPath}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
