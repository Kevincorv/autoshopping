import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "";
    const category = url.searchParams.get("category") || "";
    const brand = url.searchParams.get("brand") || "";
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "24") || 24);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0") || 0);

    const where: Record<string, unknown> = { isActive: true };
    if (q) where.OR = [{ name: { contains: q } }, { sku: { contains: q } }, { brandName: { contains: q } }];
    if (category) where.category = { slug: category };
    if (brand) where.brand = { slug: brand };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true, name: true, slug: true, sku: true, price: true, comparePrice: true,
          stock: true, rating: true, reviews: true, sold: true, brandName: true,
          shortDescription: true,
          images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
          category: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        comparePrice: p.comparePrice,
        stock: p.stock,
        rating: p.rating,
        reviews: p.reviews,
        sold: p.sold,
        brand: p.brandName,
        image: p.images[0]?.url || null,
        category: p.category?.name || null,
        shortDescription: p.shortDescription,
      })),
      total,
      limit,
      offset,
    });
  } catch {
    return NextResponse.json({ products: [], total: 0 }, { status: 500 });
  }
}
