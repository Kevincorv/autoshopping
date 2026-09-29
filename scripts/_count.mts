import "dotenv/config";
import { PrismaClient } from "../prisma/client/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb from "mariadb";

const rawUrl = process.env.DATABASE_URL || "";
const url = new URL(rawUrl);
const pool = mariadb.createPool({
  host: url.hostname,
  port: parseInt(url.port || "4000"),
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ""),
  ssl: { rejectUnauthorized: false },
  connectTimeout: 30000,
});

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(pool as any) });

const total = await prisma.productImage.count();
const products = await prisma.product.count({ where: { isActive: true } });
const withoutImages = await prisma.$queryRaw<{ count: bigint }[]>`
  SELECT COUNT(*) as count FROM Product p
  LEFT JOIN ProductImage pi ON pi.productId = p.id
  WHERE pi.id IS NULL AND p.isActive = 1
`;

console.log(`Total imágenes: ${total}`);
console.log(`Total productos activos: ${products}`);
console.log(`Sin imágenes: ${Number(withoutImages[0].count)}`);
console.log(`Cobertura: ${Math.round(total / products * 100)}%`);

await prisma.$disconnect();
