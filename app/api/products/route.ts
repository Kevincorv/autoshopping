import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function resolveBrand(brandId?: string | null) {
  if (brandId) {
    const b = await prisma.brand.findUnique({ where: { id: brandId } });
    if (b) return b;
  }
  return prisma.brand.upsert({
    where: { slug: "sin-marca" },
    update: {},
    create: { name: "Sin marca", slug: "sin-marca" },
  });
}

export async function POST(request: Request) {
  try {
    const d = await request.json();
    const name = (d.name || "").trim();
    const sku = (d.sku || "").trim();
    if (!name || !sku) return NextResponse.json({ error: "Nombre y SKU son requeridos" }, { status: 400 });

    const category = d.categoryId
      ? await prisma.category.findFirst({ where: { OR: [{ id: d.categoryId }, { slug: d.categoryId }] } })
      : null;
    if (!category) return NextResponse.json({ error: "Seleccioná una categoría" }, { status: 400 });

    const existing = await prisma.product.findFirst({ where: { OR: [{ sku }, { name }] } });
    if (existing) return NextResponse.json({ error: "Ya existe un producto con ese SKU o nombre" }, { status: 409 });

    let slug = (d.slug || "").trim() || slugify(name);
    if (!slug || (await prisma.product.findUnique({ where: { slug } }))) {
      slug = `${slugify(name)}-${Date.now().toString(36).slice(-4)}`;
    }

    const brand = await resolveBrand(d.brandId);

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        brandId: brand.id,
        categoryId: category.id,
        manufacturerCode: d.manufacturerCode || null,
        price: parseFloat(d.price) || 0,
        comparePrice: d.comparePrice != null && d.comparePrice !== "" ? parseFloat(d.comparePrice) : null,
        costPrice: d.costPrice != null && d.costPrice !== "" ? parseFloat(d.costPrice) : null,
        stock: parseFloat(d.stock) || 0,
        minStock: parseInt(d.minStock) || 5,
        unit: d.unit || "pieza",
        description: d.description || "",
        shortDescription: d.shortDescription || "",
        weight: d.weight != null && d.weight !== "" ? parseFloat(d.weight) : null,
        isActive: d.isActive !== false,
        isFeatured: !!d.isFeatured,
        isNew: d.isNew !== false,
        images: {
          create: (Array.isArray(d.images) ? d.images : []).filter((i: any) => i?.url).map((i: any, idx: number) => ({
            url: i.url,
            alt: i.alt || null,
            isPrimary: !!i.isPrimary || idx === 0,
            sortOrder: idx,
          })),
        },
        specs: {
          create: (Array.isArray(d.specs) ? d.specs : []).filter((s: any) => s?.specName).map((s: any) => ({
            specName: s.specName,
            specValue: s.specValue || "",
          })),
        },
        tags: {
          create: (Array.isArray(d.tags) ? d.tags : []).map((t: string) => ({ tag: t })),
        },
      },
      include: {
        images: true,
        specs: true,
        tags: true,
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Product create error:", error);
    return NextResponse.json({ error: "Error al crear el producto" }, { status: 500 });
  }
}

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

    const includeInactive = searchParams.get("all") === "1";
    const where: Record<string, unknown> = includeInactive ? {} : { isActive: true };

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
      isFeatured: p.isFeatured,
      isActive: p.isActive,
      isNew: p.isNew,
      minStock: p.minStock,
      unit: p.unit,
      sold: p.sold,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({ products: mapped, total });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json({ products: [], total: 0 });
  }
}
