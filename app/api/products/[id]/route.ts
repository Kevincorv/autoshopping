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
        brandSlug: product.brand.slug,
        category: product.category.slug,
        categoryName: product.category.name,
        price: product.price,
        comparePrice: product.comparePrice,
        currency: product.currency,
        stock: product.stock,
        minStock: product.minStock,
        sku: product.sku,
        manufacturerCode: product.manufacturerCode,
        barcode: product.barcode,
        secondaryBarcode: product.secondaryBarcode,
        description: product.description,
        shortDescription: product.shortDescription,
        images: product.images.map((i) => ({ url: i.url, alt: i.alt, isPrimary: i.isPrimary })),
        specs: product.specs.map((s) => ({ name: s.specName, value: s.specValue })),
        tags: product.tags.map((t) => t.tag),
        rating: product.rating,
        reviews: product.reviews,
        featured: product.isFeatured,
        isNew: product.isNew,
        isActive: product.isActive,
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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const existing = await prisma.product.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
    });
    if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const {
      name,
      slug,
      sku,
      manufacturerCode,
      brandId,
      categoryId,
      price,
      comparePrice,
      stock,
      minStock,
      description,
      shortDescription,
      isActive,
      isFeatured,
      isNew,
      weight,
      images,
      specs,
      tags,
      currency,
      unit,
      barcode,
      secondaryBarcode,
      costPrice,
      wholesalePrice,
      salePrice,
      unitCost,
    } = body || {};

    let brandUpdate: { id: string } | undefined;
    if (brandId) {
      const brand = await prisma.brand.findUnique({ where: { slug: brandId } });
      if (!brand) return NextResponse.json({ error: "Marca no encontrada" }, { status: 400 });
      brandUpdate = { id: brand.id };
    }

    let categoryUpdate: { id: string } | undefined;
    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { slug: categoryId } });
      if (!category) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 400 });
      categoryUpdate = { id: category.id };
    }

    const priceNum = price != null && price !== "" ? parseFloat(price) : existing.price;
    const compareNum = comparePrice === "" || comparePrice == null ? null : parseFloat(comparePrice);
    const stockNum = stock != null && stock !== "" ? parseFloat(stock) : existing.stock;
    const minStockNum = minStock != null && minStock !== "" ? parseInt(minStock) : existing.minStock;

    await prisma.productImage.deleteMany({ where: { productId: existing.id } });
    await prisma.productSpec.deleteMany({ where: { productId: existing.id } });
    await prisma.productTag.deleteMany({ where: { productId: existing.id } });

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: name ? String(name).trim() : existing.name,
        slug: existing.slug,
        sku: existing.sku,
        manufacturerCode: manufacturerCode !== undefined ? (manufacturerCode ? String(manufacturerCode) : null) : existing.manufacturerCode,
        barcode: barcode !== undefined ? (barcode ? String(barcode) : null) : existing.barcode,
        secondaryBarcode: secondaryBarcode !== undefined ? (secondaryBarcode ? String(secondaryBarcode) : null) : existing.secondaryBarcode,
        brandId: brandUpdate ? brandUpdate.id : existing.brandId,
        categoryId: categoryUpdate ? categoryUpdate.id : existing.categoryId,
        brandName: brandUpdate ? (await prisma.brand.findUnique({ where: { id: brandUpdate.id } }))?.name : existing.brandName,
        price: priceNum,
        comparePrice: compareNum,
        costPrice: costPrice !== undefined ? (costPrice === "" || costPrice == null ? null : parseFloat(costPrice)) : existing.costPrice,
        unitCost: unitCost !== undefined ? (unitCost === "" || unitCost == null ? null : parseFloat(unitCost)) : existing.unitCost,
        salePrice: salePrice !== undefined ? (salePrice === "" || salePrice == null ? null : parseFloat(salePrice)) : existing.salePrice,
        wholesalePrice: wholesalePrice !== undefined ? (wholesalePrice === "" || wholesalePrice == null ? null : parseFloat(wholesalePrice)) : existing.wholesalePrice,
        currency: currency || existing.currency,
        stock: stockNum,
        minStock: minStockNum,
        unit: unit || existing.unit,
        description: description !== undefined ? String(description) : existing.description,
        shortDescription: shortDescription !== undefined ? String(shortDescription) : existing.shortDescription,
        isActive: isActive !== undefined ? !!isActive : existing.isActive,
        isFeatured: isFeatured !== undefined ? !!isFeatured : existing.isFeatured,
        isNew: isNew !== undefined ? !!isNew : existing.isNew,
        weight: weight !== undefined ? (weight === "" || weight == null ? null : parseFloat(weight)) : existing.weight,
        images: Array.isArray(images)
          ? {
              create: images
                .filter((i: any) => i && i.url)
                .map((i: any, idx: number) => ({
                  url: String(i.url),
                  alt: i.alt ? String(i.alt) : null,
                  isPrimary: idx === 0,
                  sortOrder: idx,
                })),
            }
          : undefined,
        specs: Array.isArray(specs)
          ? {
              create: specs
                .filter((s: any) => s && s.specName && s.specValue)
                .map((s: any) => ({ specName: String(s.specName), specValue: String(s.specValue) })),
            }
          : undefined,
        tags: Array.isArray(tags)
          ? { create: tags.filter((t: any) => t).map((t: any) => ({ tag: String(t) })) }
          : undefined,
      },
    });

    return NextResponse.json({ product: { id: updated.id, slug: updated.slug, name: updated.name } });
  } catch (error: any) {
    console.error("Product update error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un producto con ese slug o SKU" }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || "Error al actualizar producto" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.product.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
    });
    if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    await prisma.productImage.deleteMany({ where: { productId: existing.id } });
    await prisma.productSpec.deleteMany({ where: { productId: existing.id } });
    await prisma.productTag.deleteMany({ where: { productId: existing.id } });
    await prisma.product.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Product delete error:", error);
    return NextResponse.json({ error: error?.message || "Error al eliminar producto" }, { status: 500 });
  }
}
