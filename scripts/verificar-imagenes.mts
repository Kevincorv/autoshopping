import { PrismaClient } from "../prisma/client/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb from "mariadb";
import "dotenv/config";
import { poolConfigFromEnv } from "./_db-env.js";

const pool = mariadb.createPool(poolConfigFromEnv());

const adapter = new PrismaMariaDb(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  const totalProducts = await prisma.product.count();
  const totalImages = await prisma.productImage.count();

  const productsWithoutImages = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM Product p
    LEFT JOIN ProductImage pi ON pi.productId = p.id
    WHERE pi.id IS NULL AND p.isActive = 1
  `;

  const productsWithImages = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT p.id) as count
    FROM Product p
    INNER JOIN ProductImage pi ON pi.productId = p.id
    WHERE p.isActive = 1
  `;

  console.log("=== Estado de imágenes en la base de datos ===");
  console.log(`Total productos activos: ${totalProducts}`);
  console.log(`Total imágenes guardadas: ${totalImages}`);
  console.log(`Productos CON imagen: ${productsWithImages[0].count}`);
  console.log(`Productos SIN imagen: ${productsWithoutImages[0].count}`);

  console.log("\n=== Imágenes por página (100 productos por página) ===");
  for (let page = 1; page <= 33; page++) {
    const offset = (page - 1) * 100;
    const result = await prisma.$queryRaw<{ total: bigint; with_images: bigint }[]>`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN pi.id IS NOT NULL THEN 1 ELSE 0 END) as with_images
      FROM (
        SELECT p.id
        FROM Product p
        WHERE p.isActive = 1
        ORDER BY p.name ASC
        LIMIT 100 OFFSET ${offset}
      ) sub
      LEFT JOIN ProductImage pi ON pi.productId = sub.id
    `;
    if (result.length > 0) {
      const withImages = Number(result[0].with_images || 0);
      const total = Number(result[0].total);
      const percentage = total > 0 ? ((withImages / total) * 100).toFixed(1) : "0.0";
      console.log(`Página ${page}: ${withImages}/${total} productos con imagen (${percentage}%)`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
