import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const brand = await prisma.brand.findUnique({ where: { id: params.id }, include: { _count: { select: { products: true } } } });
    if (!brand) return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.logo === "string") data.logo = body.logo || null;
    if (typeof body.description === "string") data.description = body.description || null;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const updated = await prisma.brand.update({ where: { id: params.id }, data });
    await audit({ action: "update", resource: "brands", resourceId: brand.id, details: `Marca actualizada: ${body.name || brand.name}`, request });
    return NextResponse.json({ brand: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar marca" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const brand = await prisma.brand.findUnique({ where: { id: params.id }, include: { _count: { select: { products: true } } } });
    if (!brand) return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });
    if (brand._count.products > 0) {
      return NextResponse.json({ error: `No se puede eliminar: tiene ${brand._count.products} productos asociados` }, { status: 409 });
    }
    await prisma.brand.delete({ where: { id: params.id } });
    await audit({ action: "delete", resource: "brands", resourceId: brand.id, details: `Marca eliminada: ${brand.name}`, request });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al eliminar marca" }, { status: 500 });
  }
}