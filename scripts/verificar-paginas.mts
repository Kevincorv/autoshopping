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
  console.log("=== Verificación de imágenes por página (5-33) ===\n");
  
  for (let page = 5; page <= 33; page++) {
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
      const status = withImages === total ? "✓ COMPLETO" : withImages === 0 ? "✗ VACÍO" : "◐ PARCIAL";
      console.log(`Página ${page}: ${withImages}/${total} (${percentage}%) ${status}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
