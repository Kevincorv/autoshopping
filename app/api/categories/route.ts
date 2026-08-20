import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const CATEGORY_IMAGES: Record<string, string> = {
  "carpitas": "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400",
  "multimedias": "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400",
  "suntek": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400",
  "vonixx": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400",
  "sparco": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400",
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });

    const slug = (body.slug || "").trim() || slugify(name);
    const existing = await prisma.category.findFirst({ where: { OR: [{ name }, { slug }] } });
    if (existing) return NextResponse.json({ error: "Ya existe una categoría con ese nombre o slug" }, { status: 409 });

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: body.description || null,
        image: body.image || null,
        sortOrder: body.sortOrder != null ? parseInt(body.sortOrder) || 0 : 0,
        isActive: body.isActive ?? true,
      },
    });
    await audit({ action: "create", resource: "categories", resourceId: category.id, details: `Categoría creada: ${name}`, request });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Category create error:", error);
    return NextResponse.json({ error: "Error al crear la categoría" }, { status: 500 });
  }
}
