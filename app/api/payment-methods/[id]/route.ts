import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.paymentMethod.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Método no encontrado" }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
      const dup = await prisma.paymentMethod.findFirst({ where: { name, id: { not: existing.id } } });
      if (dup) return NextResponse.json({ error: "Ya existe un método con ese nombre" }, { status: 409 });
      data.name = name;
    }
    if (body.type !== undefined) data.type = body.type || "efectivo";
    if (body.icon !== undefined) data.icon = body.icon || null;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.commission !== undefined) data.commission = parseFloat(body.commission) || 0;
    if (body.minAmount !== undefined) data.minAmount = parseFloat(body.minAmount) || 0;
    if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder) || 0;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;

    const method = await prisma.paymentMethod.update({ where: { id: existing.id }, data });
    await audit({ action: "update", resource: "settings", resourceId: method.id, details: `Método de pago actualizado: ${method.name}`, request });
    return NextResponse.json({ method });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar el método" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.paymentMethod.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Método no encontrado" }, { status: 404 });
    await prisma.paymentMethod.delete({ where: { id: existing.id } });
    await audit({ action: "delete", resource: "settings", resourceId: existing.id, details: `Método de pago eliminado: ${existing.name}`, request });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al eliminar el método" }, { status: 500 });
  }
}