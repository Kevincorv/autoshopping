import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        purchases: {
          orderBy: { createdAt: "desc" },
          take: 60,
          include: { items: { select: { id: true, productName: true, quantity: true, unitCost: true } } },
        },
      },
    });
    if (!supplier) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });

    const purchases = supplier.purchases;
    const stats = {
      totalPurchases: purchases.length,
      totalSpent: purchases.reduce((s, p) => s + p.total, 0),
      unpaid: purchases.filter((p) => p.status !== "cancelled").reduce((s, p) => s + (p.total - p.amountPaid), 0),
      productCount: new Set(purchases.flatMap((p) => p.items.map((i) => i.id))).size,
    };

    return NextResponse.json({ supplier, stats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener proveedor" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
    if (!supplier) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });

    const fields: (keyof typeof body & string)[] = ["name", "ruc", "email", "phone", "whatsapp", "address", "city", "notes", "paymentTerms", "contacts"];
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      if (typeof body[f] === "string") data[f] = body[f] || null;
    }
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const updated = await prisma.supplier.update({ where: { id: params.id }, data });
    await audit({ action: "update", resource: "suppliers", resourceId: supplier.id, details: `Proveedor actualizado: ${body.name || supplier.name}`, request });
    return NextResponse.json({ supplier: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar proveedor" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: params.id }, include: { _count: { select: { purchases: true } } } });
    if (!supplier) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    if (supplier._count.purchases > 0) {
      return NextResponse.json({ error: `No se puede eliminar: tiene ${supplier._count.purchases} compras registradas` }, { status: 409 });
    }
    await prisma.supplier.delete({ where: { id: params.id } });
    await audit({ action: "delete", resource: "suppliers", resourceId: supplier.id, details: `Proveedor eliminado: ${supplier.name}`, request });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al eliminar proveedor" }, { status: 500 });
  }
}