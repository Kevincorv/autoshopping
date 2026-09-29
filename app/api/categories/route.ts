import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CATEGORY_IMAGES: Record<string, string> = {
  "carpitas": "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400",
  "multimedia": "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400",
  "suntek": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400",
  "vonixx": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400",
  "sparco": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400",
};

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
      orderBy: { sortOrder: "asc" },
    });

    let sampleByCategory: Record<string, string> = {};
    if (categories.length > 0) {
      try {
        const samples = await prisma.product.findMany({
          where: {
            isActive: true,
            categoryId: { in: categories.map((c) => c.id) },
            images: { some: {} },
          },
          select: {
            categoryId: true,
            images: {
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
              take: 1,
              select: { url: true },
            },
          },
          orderBy: [{ sold: "desc" }, { createdAt: "desc" }],
          distinct: ["categoryId"],
        });
        sampleByCategory = samples.reduce<Record<string, string>>((acc, p) => {
          if (p.images[0]?.url) acc[p.categoryId] = p.images[0].url;
          return acc;
        }, {});
      } catch (e) {
        console.error("Category sample images error:", e);
      }
    }

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.slug,
        name: c.name,
        slug: c.slug,
        count: c._count.products,
        image: sampleByCategory[c.id] || c.image || CATEGORY_IMAGES[c.slug] || null,
        parentId: c.parentId,
      })),
    });
  } catch (error) {
    console.error("Categories error:", error);
    return NextResponse.json({ categories: [] });
  }
}
