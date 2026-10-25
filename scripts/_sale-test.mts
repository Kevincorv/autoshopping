import { config } from "dotenv";
config({ path: ".env.local" });
config();
const { prisma } = await import("../lib/prisma");

try {
  const n = await prisma.product.count({
    where: {
      isActive: true,
      comparePrice: { gt: prisma.product.fields.price as any },
    },
  });
  console.log("SALE_COUNT", n);
} catch (e: any) {
  console.log("SALE_ERR", e?.message?.slice(0, 300));
}

try {
  const sample = await prisma.product.findMany({ where: { isActive: true }, take: 3, select: { id: true } });
  const byIds = await prisma.product.count({ where: { id: { in: sample.map((s) => s.id) } } });
  console.log("IDS_OK", byIds);
} catch (e: any) {
  console.log("IDS_ERR", e?.message?.slice(0, 300));
}

