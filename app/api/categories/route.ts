import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { requirePermission } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json({ categories: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request as any, "categories.write");
    if (auth.response) return auth.response;
    const body = await request.json();
    const { name, slug, isActive, sortOrder, parentId } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const cleanName = String(name).trim();
    if (!cleanName) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const cleanSlug = slug && String(slug).trim()
      ? slugify(String(slug))
      : slugify(cleanName);

    const existingSlug = await prisma.category.findUnique({ where: { slug: cleanSlug } });
    if (existingSlug) {
      return NextResponse.json({ error: "Ya existe una categoría con ese slug" }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: {
        name: cleanName,
        slug: cleanSlug,
        isActive: isActive !== false,
        sortOrder: sortOrder !== undefined ? sortOrder : 0,
        parentId,
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requirePermission(request as any, "categories.write");
    if (auth.response) return auth.response;
    const body = await request.json();
    const { slug, id, name, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de categoría requerido" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { slug: id } });
    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    const updateData: any = {};
    if (name) {
      updateData.name = String(name).trim();
      updateData.slug = slugify(String(name).trim());
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updated = await prisma.category.update({
      where: { slug: id },
      data: updateData,
    });

    return NextResponse.json({ category: updated });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar categoría" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePermission(request as any, "categories.write");
    if (auth.response) return auth.response;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de categoría requerido" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { slug: id } });
    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    const productCount = await prisma.product.count({ where: { categoryId: category.id } });
    if (productCount > 0) {
      return NextResponse.json({ error: "No se puede borrar: la categoría tiene productos asociados" }, { status: 409 });
    }

    await prisma.category.delete({ where: { slug: id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al borrar categoría" }, { status: 500 });
  }
}