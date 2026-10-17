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
  const activeProducts = await prisma.product.count({ where: { isActive: true } });
  const inactiveProducts = await prisma.product.count({ where: { isActive: false } });

  console.log("=== Estado de productos en la base de datos ===");
  console.log(`Total productos: ${totalProducts}`);
  console.log(`Activos: ${activeProducts}`);
  console.log(`Inactivos: ${inactiveProducts}`);
  console.log(`% Activos: ${((activeProducts / totalProducts) * 100).toFixed(1)}%`);
  console.log(`% Inactivos: ${((inactiveProducts / totalProducts) * 100).toFixed(1)}%`);

  // Mostrar algunos productos inactivos
  const inactive = await prisma.product.findMany({
    where: { isActive: false },
    take: 10,
    select: { name: true, sku: true, isActive: true }
  });

  console.log(`\n=== Últimos 10 productos inactivos ===`);
  for (const p of inactive) {
    console.log(`- ${p.name} (SKU: ${p.sku}) - Activo: ${p.isActive}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
