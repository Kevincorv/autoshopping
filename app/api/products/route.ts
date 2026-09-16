import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

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

    const includeInactive = searchParams.get("includeInactive") === "1";
    const where: Record<string, unknown> = {};
    if (!includeInactive) where.isActive = true;

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

async function generateUniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || `product-${Date.now()}`;
  let candidate = root;
  let i = 2;
  while (await prisma.product.findUnique({ where: { slug: candidate } })) {
    candidate = `${root}-${i}`;
    i += 1;
  }
  return candidate;
}

async function generateUniqueSku(base: string): Promise<string> {
  const root = (base || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "SKU";
  let candidate = root;
  let i = 2;
  while (await prisma.product.findUnique({ where: { sku: candidate } })) {
    candidate = `${root}-${i}`;
    i += 1;
  }
  return candidate;
}

export async function POST(request: Request) {
  const auth = await requireAuth(request as any);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
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

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }
    if (!brandId) return NextResponse.json({ error: "Selecciona una marca" }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: "Selecciona una categoría" }, { status: 400 });

    const brand = await prisma.brand.findUnique({ where: { slug: brandId } });
    if (!brand) return NextResponse.json({ error: "Marca no encontrada" }, { status: 400 });

    const category = await prisma.category.findUnique({ where: { slug: categoryId } });
    if (!category) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 400 });

    const finalSlug = slug && String(slug).trim()
      ? await generateUniqueSlug(String(slug))
      : await generateUniqueSlug(name);

    const finalSku = sku && String(sku).trim()
      ? await generateUniqueSku(String(sku))
      : await generateUniqueSku(name);

    const priceNum = parseFloat(price) || 0;
    const compareNum = comparePrice != null && comparePrice !== "" ? parseFloat(comparePrice) : null;
    const stockNum = parseFloat(stock) || 0;
    const minStockNum = parseInt(minStock) || 5;

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        sku: finalSku,
        manufacturerCode: manufacturerCode ? String(manufacturerCode).trim() : null,
        barcode: barcode ? String(barcode).trim() : null,
        secondaryBarcode: secondaryBarcode ? String(secondaryBarcode).trim() : null,
        brandId: brand.id,
        categoryId: category.id,
        brandName: brand.name,
        price: priceNum,
        comparePrice: compareNum,
        costPrice: costPrice != null && costPrice !== "" ? parseFloat(costPrice) : null,
        unitCost: unitCost != null && unitCost !== "" ? parseFloat(unitCost) : null,
        salePrice: salePrice != null && salePrice !== "" ? parseFloat(salePrice) : null,
        wholesalePrice: wholesalePrice != null && wholesalePrice !== "" ? parseFloat(wholesalePrice) : null,
        currency: currency || "PYG",
        stock: stockNum,
        minStock: minStockNum,
        unit: unit || "pieza",
        description: description ? String(description) : "",
        shortDescription: shortDescription ? String(shortDescription) : "",
        isActive: isActive !== false,
        isFeatured: !!isFeatured,
        isNew: isNew !== false,
        weight: weight != null && weight !== "" ? parseFloat(weight) : null,
        images: Array.isArray(images) && images.length
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
        specs: Array.isArray(specs) && specs.length
          ? {
              create: specs
                .filter((s: any) => s && s.specName && s.specValue)
                .map((s: any) => ({ specName: String(s.specName), specValue: String(s.specValue) })),
            }
          : undefined,
        tags: Array.isArray(tags) && tags.length
          ? { create: tags.filter((t: any) => t).map((t: any) => ({ tag: String(t) })) }
          : undefined,
      },
      include: {
        images: true,
        specs: true,
        tags: true,
        brand: { select: { name: true } },
        category: { select: { name: true, slug: true } },
      },
    });

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        brand: product.brand.name,
        category: product.category.slug,
        price: product.price,
        stock: product.stock,
      },
    });
  } catch (error: any) {
    console.error("Product create error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un producto con ese slug o SKU" }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || "Error al crear producto" }, { status: 500 });
  }
}
