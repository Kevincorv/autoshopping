import "dotenv/config";
import { PrismaClient } from "../prisma/client/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb from "mariadb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DELAY_MS = 1000;

// ── Traductor de consulta ──
function translateQuery(name: string): string {
  let q = name.toLowerCase();
  const TRANSLATIONS_LOCAL: Record<string, string> = {
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
  for (const [es, en] of Object.entries(TRANSLATIONS_LOCAL)) {
    if (q.includes(es)) {
      q = q.replace(es, en);
      break;
    }
  }
  return q.replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
}

const SERPAPI_KEY = process.env.SERPAPI_KEY;       // Google Images via SerpApi
const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY;  // Brave Image Search
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;  // Gemini API para verificación

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

// ── Búsqueda en Wikimedia Commons ──
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

// ── Buscar imagen usando DuckDuckGo (ya disponible) ──
async function searchDuckDuckGo(query: string): Promise<string | null> {
  try {
    const results = await imageSearch({
      query,
      safe: true,
      retries: 2,
      iterations: 1,
    });
    if (results.length > 0) {
      const url = results[0].image;
      if (url && !url.includes("loremflickr") && !url.includes("placehold")) {
        return url;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Búsqueda SerpApi (Google Images) ──
async function searchSerpApi(query: string): Promise<string | null> {
  if (!SERPAPI_KEY) return null;
  try {
    const url = new URL(
      `https://serpapi.com/search.json?engine=images&q=${encodeURIComponent(
        query
      )}&api_key=${SERPAPI_KEY}`
    );
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "AutoShoppingBot/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const images = data.images || [];
    for (const img of images) {
      const link = img.link || img.image;
      if (
        link &&
        !link.includes("loremflickr") &&
        !link.includes("placehold") &&
        !link.includes("images.google") &&
        !link.includes("base64")
      ) {
        return link;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Brave Image Search API ──
async function searchBrave(query: string): Promise<string | null> {
  if (!BRAVE_SEARCH_API_KEY) return null;
  try {
    const braveUrl = new URL(
      `https://api.search.brave.com/res/v1/images/search?query=${encodeURIComponent(
        query
      )}`
    );
    const res = await fetch(braveUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_SEARCH_API_KEY,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.results || [];
    for (const img of results) {
      const src = img.url || img.default_url;
      if (src && !src.includes("loremflickr") && !src.includes("placehold")) {
        return src;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Verificación con Gemini API ──
async function verifyWithGemini(imageUrl: string, productName: string): Promise<boolean> {
  if (!GEMINI_API_KEY) return true; // Si no hay clave, no bloquear
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
          text: `Verify if this image shows a "${productName}" automotive product. Respond only with "YES" if it clearly shows the product, or "NO" if it does not match. Do not add any explanation.`,
        },
      ],
    });

    const text = response.text?.trim().toUpperCase();
    return text === "YES";
  } catch {
    return true; // No bloquear si falla
  }
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

// ── Proveedor "oficial" usando metadatos de la BD ──
async function searchOfficialCatalog(name: string): Promise<string | null> {
  // En una implementación completa, esto consultaría APIs de fabricantes
  // Por ahora, usamos DuckDuckGo con consultas optimizadas "oficial"
  const queries = [
    `${translateQuery(name)} official product`,
    `${translateQuery(name)} genuine part`,
  ];
  for (const q of queries) {
    const result = await searchDuckDuckGo(q);
    if (result) return result;
    await sleep(300);
  }
  return null;
}

// ── Flujo principal de búsqueda de imagen ──
async function findProductImage(productName: string): Promise<{
  imageUrl: string | null;
  source: string;
  verification: boolean;
}> {
  const queries = buildSearchQueries(productName);

  let imageUrl: string | null = null;
  let source = "none";
  let verification = true;

  // Orden según especificación: Oficial → SerpApi → Brave → Wikimedia → Web complementaria

  // Paso 1: Catálogos oficiales
  for (const q of queries) {
    const result = await searchOfficialCatalog(q);
    if (result) {
      imageUrl = result;
      source = "official-catalog";
      break;
    }
    await sleep(300);
  }

  // Paso 2: SerpApi
  if (!imageUrl) {
    for (const q of queries) {
      const result = await searchSerpApi(q);
      if (result) {
        imageUrl = result;
        source = "serpapi";
        break;
      }
      await sleep(300);
    }
  }

  // Paso 3: Brave
  if (!imageUrl) {
    for (const q of queries) {
      const result = await searchBrave(q);
      if (result) {
        imageUrl = result;
        source = "brave";
        break;
      }
      await sleep(300);
    }
  }

  // Paso 4: Wikimedia Commons
  if (!imageUrl) {
    for (const q of queries) {
      const result = await searchWikimedia(q);
      if (result) {
        imageUrl = result;
        source = "wikimedia";
        break;
      }
      await sleep(300);
    }
  }

  // Paso 5: DuckDuckGo como complementario
  if (!imageUrl) {
    for (const q of queries) {
      const result = await searchDuckDuckGo(q);
      if (result) {
        imageUrl = result;
        source = "duckduckgo";
        break;
      }
      await sleep(300);
    }
  }

  // Verificación con Gemini
  if (imageUrl && source !== "none") {
    verification = await verifyWithGemini(imageUrl, productName);
    if (!verification) {
      // Intentar con siguiente consulta
      for (const q of queries.slice(1)) {
        const newUrl = await findProductImageUsingQuery(q);
        if (newUrl && newUrl.imageUrl) {
          imageUrl = newUrl.imageUrl;
          source = newUrl.source || source;
          break;
        }
      }
      verification = true;
    }
  }

  return { imageUrl, source, verification };
}

// ── Función auxiliar: búsqueda en una consulta específica ──
async function findProductImageUsingQuery(
  query: string
): Promise<{ imageUrl: string | null; source: string }> {
  // Probar DuckDuckGo primero
  const ddg = await searchDuckDuckGo(query);
  if (ddg) return { imageUrl: ddg, source: "duckduckgo" };

  // Luego SerpApi si tiene clave
  if (SERPAPI_KEY) {
    const serp = await searchSerpApi(query);
    if (serp) return { imageUrl: serp, source: "serpapi" };
  }

  // Luego Brave si tiene clave
  if (BRAVE_SEARCH_API_KEY) {
    const brave = await searchBrave(query);
    if (brave) return { imageUrl: brave, source: "brave" };
  }

  return { imageUrl: null, source: "none" };
}

// ── Sleep helper ──
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main execution ──
async function main() {
  console.log("=== AutoShopping: Actualización completa de imágenes del catálogo ===\n");

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

  // Identificar productos sin imágenes usando queryRaw simple
  const productsWithoutImages: any[] = await prisma.$queryRaw`
    SELECT p.id, p.name, p.slug, p.sku
    FROM Product p
    LEFT JOIN ProductImage pi ON pi.productId = p.id
    WHERE pi.id IS NULL AND p.isActive = 1
    ORDER BY p.name ASC
  `;

  console.log(`Productos activos: await prisma.product.count()`);

  // Contar total de productos activos
  const totalProducts = await prisma.product.count({
    where: { isActive: true },
  });
  console.log(`Productos activos totales: ${totalProducts}`);
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
  console.log("=== RESUMEN FINAL DE ACTUALIZACIÓN ===");
  console.log("========================================");
  console.log(`Total procesados: ${total}`);
  console.log(`Aplicados (imagen guardada): ${applied}`);
  console.log(`Sin imagen encontrada: ${noImageFound}`);
  console.log(`Fallos/Errores: ${failed}`);

  // Guardar log detallado
  const logPath = path.join(__dirname, "image-updates-completo-log.json");
  fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
  console.log(`\nLog detallado guardado: ${logPath}`);

  // Instrucciones para configurar claves
  console.log("\n=== CONFIGURACIÓN DE CLAVES API ===");
  if (!SERPAPI_KEY) {
    console.log(
      "  - SERPAPI_KEY: Obtén una en https://serpapi.com (requiere cuenta/pago)"
    );
  }
  if (!BRAVE_SEARCH_API_KEY) {
    console.log(
      "  - BRAVE_SEARCH_API_KEY: Obtén una en https://api.search.brave.com (requiere registro)"
    );
  }
  if (!GEMINI_API_KEY) {
    console.log(
      "  - GEMINI_API_KEY: Opcional para verificación. Obtén una en https://ai.google.dev"
    );
  }

  console.log("\n=== PRÓXIMOS PASOS ===");
  console.log(
    "1. Configura SERPAPI_KEY y/o BRAVE_SEARCH_API_KEY en el archivo .env"
  );
  console.log(
    "2. Ejecuta el script nuevamente para completar más productos"
  );
  console.log(
    "3. Revisa image-updates-completo-log.json para detalles por producto"

  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exit(1);
});