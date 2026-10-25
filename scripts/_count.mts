import { config } from "dotenv";
config({ path: ".env.local" });
config();
const { prisma } = await import("../lib/prisma");

async function main() {
  const [products, activeProducts, categories, brands, orders, users, reviews] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.category.count(),
      prisma.brand.count(),
      prisma.order.count(),
      prisma.user.count(),
      prisma.review.count().catch(() => -1),
    ]);
  console.log(
    JSON.stringify({
      products,
      activeProducts,
      categories,
      brands,
      orders,
      users,
      reviews,
    })
  );
  const byCat = await prisma.category.findMany({
    select: { name: true, slug: true, _count: { select: { products: true } } },
  });
  console.log(JSON.stringify(byCat));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("ERR", e?.message || e);
    process.exit(1);
  });
