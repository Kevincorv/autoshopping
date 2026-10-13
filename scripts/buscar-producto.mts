import { PrismaClient } from "../prisma/client/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb from "mariadb";

const pool = mariadb.createPool({
  host: "gateway01.us-east-1.prod.aws.tidbcloud.com",
  port: 4000,
  user: "3WsTbVXhshksEUi.root",
  password: "U4uJqhQsDOJv6dnZ",
  database: "autoshopping",
  ssl: { rejectUnauthorized: false },
  connectTimeout: 60000,
});

const adapter = new PrismaMariaDb(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  const searchTerm = process.argv[2] || "SPARCO CARGADOR SMART";
  
  console.log(`Buscando: "${searchTerm}"\n`);
  
  const products = await prisma.product.findMany({
    where: {
      name: { contains: searchTerm }
    },
    include: { images: true }
  });

  if (products.length === 0) {
    console.log("No se encontraron productos.");
    return;
  }

  console.log(`Se encontraron ${products.length} producto(s):\n`);
  
  for (const p of products) {
    console.log(`Producto: ${p.name}`);
    console.log(`ID: ${p.id}`);
    console.log(`SKU: ${p.sku}`);
    console.log(`Imágenes: ${p.images.length}`);
    
    if (p.images.length > 0) {
      for (const img of p.images) {
        console.log(`  URL: ${img.url}`);
        console.log(`  Primary: ${img.isPrimary}`);
      }
    } else {
      console.log("  SIN IMAGEN");
    }
    console.log("---");
  }

  await prisma.$disconnect();
}

main().catch(console.error);
