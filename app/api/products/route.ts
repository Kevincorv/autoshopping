import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "featured";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const where: Record<string, unknown> = { isActive: true };

    if (category) {
      where.category = { slug: category };
    }

    if (brand) {
      where.brand = { slug: brand.toLowerCase().replace(/\s+/g, "-") };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Record<string, unknown>).gte = parseFloat(minPrice);
      if (maxPrice) (where.price as Record<string, unknown>).lte = parseFloat(maxPrice);
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    const orderBy: Record<string, string>[] = [];
    switch (sort) {
      case "price-asc": orderBy.push({ price: "asc" }); break;
      case "price-desc": orderBy.push({ price: "desc" }); break;
      case "name": orderBy.push({ name: "asc" }); break;
      case "rating": orderBy.push({ rating: "desc" }); break;
      case "sold": orderBy.push({ sold: "desc" }); break;
      default: orderBy.push({ isFeatured: "desc" }, { createdAt: "desc" });
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: where as any,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          brand: { select: { name: true } },
          category: { select: { name: true, slug: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where: where as any }),
    ]);

    const mapped = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand.name,
      category: p.category.slug,
      categoryName: p.category.name,
      price: p.price,
      comparePrice: p.comparePrice,
      currency: p.currency,
      stock: p.stock,
      sku: p.sku,
      description: p.description,
      shortDescription: p.shortDescription,
      images: p.images.map((i) => i.url),
      rating: p.rating,
      reviews: p.reviews,
      featured: p.isFeatured,
      isNew: p.isNew,
      sold: p.sold,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ products: mapped, total });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json({ products: [], total: 0 });
  }
}
