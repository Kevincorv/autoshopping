import "dotenv/config";
import { PrismaClient } from "../prisma/client/client.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

const dbPath = path.join(__dirname, "..", "data", "db.json");
const oldDb = JSON.parse(fs.readFileSync(dbPath, "utf8"));

const CATEGORY_MAP: Record<string, { name: string; description: string }> = {
  carpitas: { name: "Carpitas", description: "Carpitas y alfombras para vehículos" },
  multimedias: { name: "Multimedia", description: "Multimedia, pantallas y radios" },
  suntek: { name: "Suntek", description: "Películas de seguridad Suntek" },
  vonixx: { name: "Vonixx", description: "Productos de estética Vonixx" },
  sparco: { name: "Sparco", description: "Accesorios Sparco" },
};

async function migrate() {
  console.log(`Migrating ${oldDb.products.length} products...`);

  for (const catId of Object.keys(CATEGORY_MAP)) {
    const cat = CATEGORY_MAP[catId];
    await prisma.category.upsert({
      where: { slug: catId },
      update: { name: cat.name, description: cat.description },
      create: { name: cat.name, slug: catId, description: cat.description },
    });
  }

  const brands = [...new Set(oldDb.products.map((p: any) => p.brand))];
  for (const brandName of brands) {
    const slug = brandName.toLowerCase().replace(/\s+/g, "-");
    await prisma.brand.upsert({
      where: { slug },
      update: { name: brandName },
      create: { name: brandName, slug },
    });
  }

  for (const oldProduct of oldDb.products) {
    const category = await prisma.category.findUnique({ where: { slug: oldProduct.category } });
    const brand = await prisma.brand.findUnique({
      where: { slug: oldProduct.brand.toLowerCase().replace(/\s+/g, "-") },
    });

    if (!category || !brand) {
      console.log(`Skipping ${oldProduct.name}: category or brand not found`);
      continue;
    }

    await prisma.product.upsert({
      where: { slug: oldProduct.slug },
      update: {
        name: oldProduct.name,
        brandId: brand.id,
        categoryId: category.id,
        price: oldProduct.price,
        comparePrice: oldProduct.comparePrice || null,
        stock: oldProduct.stock,
        description: oldProduct.description || "",
        shortDescription: oldProduct.shortDescription || "",
        sku: oldProduct.sku,
        isFeatured: oldProduct.featured || false,
        isNew: oldProduct.isNew || false,
        rating: oldProduct.rating || 0,
        reviews: oldProduct.reviews || 0,
        sold: oldProduct.sold || 0,
      },
      create: {
        name: oldProduct.name,
        slug: oldProduct.slug,
        brandId: brand.id,
        categoryId: category.id,
        price: oldProduct.price,
        comparePrice: oldProduct.comparePrice || null,
        stock: oldProduct.stock,
        description: oldProduct.description || "",
        shortDescription: oldProduct.shortDescription || "",
        sku: oldProduct.sku,
        isFeatured: oldProduct.featured || false,
        isNew: oldProduct.isNew || false,
        rating: oldProduct.rating || 0,
        reviews: oldProduct.reviews || 0,
        sold: oldProduct.sold || 0,
      },
    });

    if (oldProduct.images?.length) {
      for (let i = 0; i < oldProduct.images.length; i++) {
        const product = await prisma.product.findUnique({ where: { slug: oldProduct.slug } });
        if (product) {
          await prisma.productImage.upsert({
            where: { id: `${product.id}-img-${i}` },
            update: { url: oldProduct.images[i] },
            create: {
              id: `${product.id}-img-${i}`,
              productId: product.id,
              url: oldProduct.images[i],
              isPrimary: i === 0,
              sortOrder: i,
            },
          });
        }
      }
    }
  }

  if (oldDb.orders?.length) {
    const fallbackProduct = await prisma.product.findFirst();
    const fallbackProductId = fallbackProduct?.id || "fallback";
    for (const oldOrder of oldDb.orders) {
      const existing = await prisma.order.findUnique({ where: { orderNumber: oldOrder.id } });
      if (!existing) {
        const items = oldOrder.items?.map((i: any) => ({
          productId: fallbackProductId,
          productName: i.name || "Producto",
          productSku: "LEGACY",
          quantity: i.quantity || 1,
          unitPrice: i.price || 0,
          subtotal: (i.price || 0) * (i.quantity || 1),
        })) || [];

        const subtotal = items.reduce((s: number, i: any) => s + i.subtotal, 0);

        try {
          await prisma.order.create({
            data: {
              orderNumber: oldOrder.id,
              status: oldOrder.status || "pending",
              subtotal,
              total: oldOrder.total || subtotal,
              customerName: oldOrder.customer?.name || "Cliente",
              customerPhone: oldOrder.customer?.phone || "",
              customerEmail: oldOrder.customer?.email || "",
              customerAddress: oldOrder.customer?.address || "",
              customerCity: "",
              items: { create: items },
              createdAt: new Date(oldOrder.createdAt || Date.now()),
            },
          });
        } catch (e) {
          console.log(`Skipping order ${oldOrder.id}: ${e instanceof Error ? e.message : 'error'}`);
        }
      }
    }
  }

  console.log("Migration completed!");
  await prisma.$disconnect();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
