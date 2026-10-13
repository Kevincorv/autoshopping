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
  const totalProducts = await prisma.product.count();
  const totalImages = await prisma.productImage.count();
  
  const productsWithImages = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT p.id) as count
    FROM Product p
    INNER JOIN ProductImage pi ON pi.productId = p.id
    WHERE p.isActive = 1
  `;

  console.log("=== Estado actual de la base de datos ===");
  console.log(`Total productos activos: ${totalProducts}`);
  console.log(`Total imágenes guardadas: ${totalImages}`);
  console.log(`Productos CON imagen: ${productsWithImages[0].count}`);
  console.log(`Productos SIN imagen: ${totalProducts - Number(productsWithImages[0].count)}`);
  
  // Verificar últimas imágenes guardadas
  const recentImages = await prisma.productImage.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { name: true } } }
  });
  
  console.log("\n=== Últimas 5 imágenes guardadas ===");
  for (const img of recentImages) {
    console.log(`- ${img.product.name}: ${img.url.substring(0, 80)}...`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
