import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: params.id },
          { slug: params.id },
        ],
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        specs: true,
        tags: true,
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const related = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true,
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        brand: { select: { name: true } },
      },
      take: 6,
    });

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        brand: product.brand.name,
        category: product.category.slug,
        categoryName: product.category.name,
        price: product.price,
        comparePrice: product.comparePrice,
        currency: product.currency,
        stock: product.stock,
        sku: product.sku,
        manufacturerCode: product.manufacturerCode,
        description: product.description,
        shortDescription: product.shortDescription,
        images: product.images.map((i) => ({ url: i.url, alt: i.alt, isPrimary: i.isPrimary })),
        specs: product.specs.map((s) => ({ name: s.specName, value: s.specValue })),
        tags: product.tags.map((t) => t.tag),
        rating: product.rating,
        reviews: product.reviews,
        featured: product.isFeatured,
        isNew: product.isNew,
        sold: product.sold,
        weight: product.weight,
        createdAt: product.createdAt.toISOString(),
      },
      related: related.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand.name,
        price: p.price,
        comparePrice: p.comparePrice,
        images: p.images.map((i) => i.url),
        rating: p.rating,
        reviews: p.reviews,
        stock: p.stock,
        isNew: p.isNew,
      })),
    });
  } catch (error) {
    console.error("Product detail error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
