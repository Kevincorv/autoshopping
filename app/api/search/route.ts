import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    if (!q) {
      return NextResponse.json({ products: [], total: 0, query: "", took: 0 });
    }

    const start = performance.now();

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { sku: { contains: q } },
          { brand: { name: { contains: q } } },
        ],
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        brand: { select: { name: true } },
        category: { select: { name: true, slug: true } },
      },
      take: limit,
    });

    const took = performance.now() - start;

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand.name,
        category: p.category.slug,
        price: p.price,
        comparePrice: p.comparePrice,
        stock: p.stock,
        sku: p.sku,
        images: p.images.map((i) => i.url),
      })),
      total: products.length,
      query: q,
      took: Math.round(took),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ products: [], total: 0, query: "", took: 0 });
  }
}
