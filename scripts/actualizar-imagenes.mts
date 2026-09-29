import "dotenv/config";
import { PrismaClient } from "../prisma/client/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb from "mariadb";
import { imageSearch } from "@mudbill/duckduckgo-images-api";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));

const DRY_RUN = !args.apply;
const LIMIT = parseInt(args.limit || "0", 10) || Infinity;
const OFFSET = parseInt(args.offset || "0", 10);
const DELAY_MS = 1500;

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
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
  alarma: "car alarm",
  soporte: "phone mount car",
  encendedor: "car lighter",
  cenicero: "car ashtray",
  cargador: "car charger",
  usb: "usb charger",
  universal: "universal",
  led: "led",
  rgb: "rgb led",
 硝子: "glass",
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
  Alpine: "car audio",
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
  desengrasante: "degreaser",
  desodorizante: "deodorizer",
  ambientador: "air freshener",
  perfume: "car perfume",
  aromatizante: "air freshener",
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
  bocina: "speaker",
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

const rawUrl =
  process.env.DATABASE_URL ||
  "mysql://3WsTbVXhshksEUi.root:U4uJqhQsDOJv6dnZ@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/autoshopping";

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

async function findProductsWithoutImages(): Promise<ProductWithoutImages[]> {
  const products = await prisma.$queryRaw<{ id: string; name: string; slug: string; sku: string }[]>`
    SELECT p.id, p.name, p.slug, p.sku
    FROM Product p
    LEFT JOIN ProductImage pi ON pi.productId = p.id
    WHERE pi.id IS NULL AND p.isActive = 1
    ORDER BY p.name ASC
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

  if (DRY_RUN) {
    return {
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      imageUrl,
      source,
      action: "would-apply",
    };
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
  console.log("=== Actualizar imágenes de productos ===");
  console.log(`Modo: ${DRY_RUN ? "DRY-RUN (preview)" : "APLICAR"}`);
  if (LIMIT !== Infinity) console.log(`Límite: ${LIMIT} productos`);
  if (OFFSET > 0) console.log(`Offset: ${OFFSET}`);

  const allProducts = await findProductsWithoutImages();
  console.log(`\nProductos sin imágenes: ${allProducts.length}`);

  const products = allProducts.slice(OFFSET, OFFSET + LIMIT);
  if (products.length === 0) {
    console.log("No hay productos para procesar.");
    await prisma.$disconnect();
    return;
  }

  console.log(`A procesar: ${products.length}\n`);

  const results: UpdateResult[] = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    process.stdout.write(
      `[${i + 1}/${products.length}] ${p.name} (${p.sku})... `
    );

    const result = await processProduct(p);
    results.push(result);

    if (result.action === "applied") {
      console.log(`OK -> ${result.imageUrl}`);
    } else if (result.action === "would-apply") {
      console.log(`PREVIEW -> ${result.imageUrl}`);
    } else if (result.action === "no-image-found") {
      console.log("sin resultados");
    } else {
      console.log(`FALLO: ${result.error}`);
    }

    if (i < products.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  const applied = results.filter((r) => r.action === "applied");
  const wouldApply = results.filter((r) => r.action === "would-apply");
  const noImage = results.filter((r) => r.action === "no-image-found");
  const failed = results.filter((r) => r.action === "failed");
  const duckduckgo = results.filter((r) => r.source === "duckduckgo");
  const fallback = results.filter((r) => r.source === "fallback");

  console.log("\n=== Resumen ===");
  console.log(`Total procesados: ${results.length}`);
  console.log(`Aplicados:       ${applied.length}`);
  console.log(`Pendientes:      ${wouldApply.length}`);
  console.log(`Sin imagen:      ${noImage.length}`);
  console.log(`Fallos:          ${failed.length}`);
  console.log(`  DuckDuckGo:    ${duckduckgo.length}`);
  console.log(`  Fallback:      ${fallback.length}`);

  if (failed.length > 0) {
    console.log("\nFallos:");
    for (const f of failed) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
  }

  const logPath = path.join(__dirname, "image-updates.json");
  fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
  console.log(`\nLog: ${logPath}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
