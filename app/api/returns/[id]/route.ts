import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ret = await prisma.returnOrder.findUnique({
      where: { id: params.id },
      include: { items: true, order: { select: { orderNumber: true, total: true } }, customer: { select: { id: true, name: true, lastname: true } } },
    });
    if (!ret) return NextResponse.json({ error: "Devolución no encontrada" }, { status: 404 });
    return NextResponse.json({ ret });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener devolución" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const ret = await prisma.returnOrder.findUnique({ where: { id: params.id } });
    if (!ret) return NextResponse.json({ error: "Devolución no encontrada" }, { status: 404 });

    const action = body.action;
    if (action === "complete") {
      const updated = await prisma.returnOrder.update({ where: { id: ret.id }, data: { status: "completed" } });
      await audit({ action: "complete", resource: "returns", resourceId: ret.id, details: `Devolución completada ${ret.returnNumber}`, request });
      return NextResponse.json({ ret: updated });
    }
    if (action === "cancel") {
      if (ret.status === "completed") return NextResponse.json({ error: "No se puede cancelar una devolución completada" }, { status: 409 });
      await prisma.$transaction(async (tx) => {
        await tx.returnOrder.update({ where: { id: ret.id }, data: { status: "cancelled" } });
        const items = await tx.returnItem.findMany({ where: { returnId: ret.id } });
        for (const item of items) {
          if (!item.productId) continue;
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) continue;
          const prev = product.stock;
          const next = Math.round((prev - item.quantity) * 100) / 100;
          await tx.product.update({ where: { id: product.id }, data: { stock: next } });
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: "SALIDA",
              quantity: item.quantity,
              reason: "ANULACIÓN DEVOLUCIÓN",
              reference: ret.returnNumber,
              unit: product.unit,
              stockBefore: prev,
              stockAfter: next,
              notes: `Se revierte la devolución ${ret.returnNumber}`,
            },
          });
        }
      });
      await audit({ action: "cancel", resource: "returns", resourceId: ret.id, details: `Devolución anulada ${ret.returnNumber}`, request });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}