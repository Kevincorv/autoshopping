import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function findCategory(idOrSlug: string) {
  return prisma.category.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await findCategory(params.id);
    if (!existing) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
      const dup = await prisma.category.findFirst({ where: { name, id: { not: existing.id } } });
      if (dup) return NextResponse.json({ error: "Ya existe una categoría con ese nombre" }, { status: 409 });
      data.name = name;
    }
    if (body.slug !== undefined) {
      const slug = slugify(String(body.slug).trim()) || existing.slug;
      const dup = await prisma.category.findFirst({ where: { slug, id: { not: existing.id } } });
      if (dup) return NextResponse.json({ error: "Ya existe una categoría con ese slug" }, { status: 409 });
      data.slug = slug;
    }
    if (body.description !== undefined) data.description = body.description || null;
    if (body.image !== undefined) data.image = body.image || null;
    if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder) || 0;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;

    const category = await prisma.category.update({ where: { id: existing.id }, data });
    await audit({ action: "update", resource: "categories", resourceId: category.id, details: `Categoría actualizada: ${category.name}`, request });
    return NextResponse.json({ category });
  } catch (error) {
    console.error("Category update error:", error);
    return NextResponse.json({ error: "Error al actualizar la categoría" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await findCategory(params.id);
    if (!existing) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

    const count = await prisma.product.count({ where: { categoryId: existing.id } });
    if (count > 0) {
      return NextResponse.json({ error: `No se puede eliminar: tiene ${count} producto(s)` }, { status: 409 });
    }

    await prisma.category.delete({ where: { id: existing.id } });
    await audit({ action: "delete", resource: "categories", resourceId: existing.id, details: `Categoría eliminada: ${existing.name}`, request });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Category delete error:", error);
    return NextResponse.json({ error: "Error al eliminar la categoría" }, { status: 500 });
  }
}