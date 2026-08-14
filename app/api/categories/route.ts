import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.slug,
        name: c.name,
        slug: c.slug,
        count: c._count.products,
        image: CATEGORY_IMAGES[c.slug] || null,
        parentId: c.parentId,
      })),
    });
  } catch (error) {
    console.error("Categories error:", error);
    return NextResponse.json({ categories: [] });
  }
}
