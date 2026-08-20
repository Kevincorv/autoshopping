import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const d = await request.json();
    const data: Record<string, unknown> = {};

    if (d.name !== undefined) {
      const name = String(d.name).trim();
      if (!name) return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
      const dup = await prisma.product.findFirst({ where: { name, id: { not: existing.id } } });
      if (dup) return NextResponse.json({ error: "Ya existe un producto con ese nombre" }, { status: 409 });
      data.name = name;
    }
    if (d.sku !== undefined) {
      const sku = String(d.sku).trim();
      const dup = await prisma.product.findFirst({ where: { sku, id: { not: existing.id } } });
      if (dup) return NextResponse.json({ error: "Ya existe un producto con ese SKU" }, { status: 409 });
      data.sku = sku;
    }
    if (d.slug !== undefined) {
      const slug = String(d.slug).trim() || existing.slug;
      const dup = await prisma.product.findFirst({ where: { slug, id: { not: existing.id } } });
      if (!dup) data.slug = slug;
    }
    if (d.categoryId !== undefined) {
      const category = d.categoryId
        ? await prisma.category.findFirst({ where: { OR: [{ id: d.categoryId }, { slug: d.categoryId }] } })
        : null;
      if (!category) return NextResponse.json({ error: "Categoría no válida" }, { status: 400 });
      data.categoryId = category.id;
    }
    if (d.brandId !== undefined) {
      const brand = d.brandId
        ? await prisma.brand.findUnique({ where: { id: d.brandId } })
        : null;
      if (!brand) return NextResponse.json({ error: "Marca no válida" }, { status: 400 });
      data.brandId = brand.id;
    }
    if (d.manufacturerCode !== undefined) data.manufacturerCode = d.manufacturerCode || null;
    if (d.price !== undefined) data.price = parseFloat(d.price) || 0;
    if (d.comparePrice !== undefined) data.comparePrice = d.comparePrice !== "" ? parseFloat(d.comparePrice) : null;
    if (d.costPrice !== undefined) data.costPrice = d.costPrice !== "" ? parseFloat(d.costPrice) : null;
    if (d.stock !== undefined) data.stock = parseFloat(d.stock) || 0;
    if (d.minStock !== undefined) data.minStock = parseInt(d.minStock) || 5;
    if (d.unit !== undefined) data.unit = d.unit || "pieza";
    if (d.description !== undefined) data.description = d.description || "";
    if (d.shortDescription !== undefined) data.shortDescription = d.shortDescription || "";
    if (d.weight !== undefined) data.weight = d.weight !== "" ? parseFloat(d.weight) : null;
    if (d.isActive !== undefined) data.isActive = !!d.isActive;
    if (d.isFeatured !== undefined) data.isFeatured = !!d.isFeatured;
    if (d.isNew !== undefined) data.isNew = !!d.isNew;

    if (d.images !== undefined && Array.isArray(d.images)) {
      const imgs = d.images.filter((i: any) => i?.url).map((i: any, idx: number) => ({
        url: String(i.url),
        alt: i.alt || null,
        isPrimary: !!i.isPrimary || idx === 0,
        sortOrder: idx,
      }));
      // ensure exactly one primary
      if (imgs.length && !imgs.some((i: any) => i.isPrimary)) imgs[0].isPrimary = true;
      data.images = { deleteMany: {}, create: imgs };
    }
    if (d.specs !== undefined && Array.isArray(d.specs)) {
      data.specs = {
        deleteMany: {},
        create: d.specs.filter((s: any) => s?.specName || s?.name).map((s: any) => ({
          specName: s.specName || s.name,
          specValue: s.specValue || s.value || "",
        })),
      };
    }
    if (d.tags !== undefined && Array.isArray(d.tags)) {
      data.tags = { deleteMany: {}, create: d.tags.map((t: string) => ({ tag: t })) };
    }

    const product = await prisma.product.update({
      where: { id: existing.id },
      data,
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json({ product });
  } catch (error) {
    console.error("Product update error:", error);
    return NextResponse.json({ error: "Error al actualizar el producto" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const refs = await Promise.all([
      prisma.orderItem.count({ where: { productId: existing.id } }),
      prisma.purchaseItem.count({ where: { productId: existing.id } }),
      prisma.stockMovement.count({ where: { productId: existing.id } }),
    ]);
    if (refs.some((n) => n > 0)) {
      return NextResponse.json({ error: "No se puede eliminar: el producto tiene movimientos asociados. Podés desactivarlo." }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: existing.id } }),
      prisma.productSpec.deleteMany({ where: { productId: existing.id } }),
      prisma.productTag.deleteMany({ where: { productId: existing.id } }),
      prisma.product.delete({ where: { id: existing.id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Product delete error:", error);
    return NextResponse.json({ error: "Error al eliminar el producto" }, { status: 500 });
  }
}

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
        brandId: product.brandId,
        category: product.category.slug,
        categoryName: product.category.name,
        price: product.price,
        comparePrice: product.comparePrice,
        currency: product.currency,
        stock: product.stock,
        minStock: product.minStock,
        unit: product.unit,
        isActive: product.isActive,
        sku: product.sku,
        manufacturerCode: product.manufacturerCode,
        description: product.description,
        shortDescription: product.shortDescription,
        images: product.images.map((i) => i.url),
        imageDetails: product.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, isPrimary: i.isPrimary })),
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
