import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        supplier: { select: { id: true, name: true, phone: true, email: true, paymentTerms: true } },
      },
    });
    if (!purchase) return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 });
    return NextResponse.json({ purchase });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener compra" }, { status: 500 });
  }
}

const receiveSchema = z.object({
  items: z.array(z.object({ id: z.string(), receivedQty: z.number().nonnegative() })),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    if (body.action === "receive") {
      const parsed = receiveSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Cantidades recibidas inválidas" }, { status: 400 });
      const purchase = await prisma.purchase.findUnique({ where: { id: params.id }, include: { items: true } });
      if (!purchase) return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 });
      if (purchase.status === "cancelled" || purchase.status === "completed") {
        return NextResponse.json({ error: `No se puede recibir una compra ${purchase.status}` }, { status: 409 });
      }

      const result = await prisma.$transaction(async (tx) => {
        let receivedTotal = 0;
        let newStatus = purchase.status;
        for (const item of purchase.items) {
          const entry = parsed.data.items.find((i) => i.id === item.id);
          if (!entry) continue;
          const toReceive = Math.min(entry.receivedQty, item.quantity - item.receivedQty);
          if (toReceive <= 0) continue;
          await tx.purchaseItem.update({ where: { id: item.id }, data: { receivedQty: { increment: toReceive } } });
          receivedTotal += toReceive;

          if (item.productId) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (product) {
              const prev = product.stock;
              const next = Math.round((prev + toReceive) * 100) / 100;
              await tx.product.update({
                where: { id: product.id },
                data: { stock: next, lastPurchaseCost: item.unitCost, unitCost: product.unitCost ?? item.unitCost },
              });
              await tx.stockMovement.create({
                data: {
                  productId: product.id,
                  type: "INGRESO",
                  quantity: toReceive,
                  reason: "COMPRA",
                  reference: `OC#${purchase.purchaseNumber}`,
                  unit: product.unit,
                  unitCost: item.unitCost,
                  stockBefore: prev,
                  stockAfter: next,
                  notes: `Ingreso por ${purchase.purchaseNumber}${purchase.supplierId ? "" : ""}`,
                },
              });
            }
          }
        }

        const items = await tx.purchaseItem.findMany({ where: { purchaseId: purchase.id } });
        const allReceived = items.length > 0 && items.every((i) => i.receivedQty >= i.quantity);
        if (allReceived) {
          newStatus = "received";
          await tx.purchase.update({ where: { id: purchase.id }, data: { status: "received", receivedAt: new Date() } });
        } else if (purchase.status === "draft") {
          newStatus = "ordered";
          await tx.purchase.update({ where: { id: purchase.id }, data: { status: "ordered" } });
        }
        return { receivedTotal, allReceived };
      });

      await audit({ action: "receive", resource: "purchases", resourceId: purchase.id, details: `Recepción de ${purchase.purchaseNumber}: ${result.receivedTotal} unidades${result.allReceived ? " (completa)" : ""}`, request });
      return NextResponse.json({ ok: true, receivedTotal: result.receivedTotal, allReceived: result.allReceived });
    }

    if (body.action === "complete") {
      const purchase = await prisma.purchase.findUnique({ where: { id: params.id }, include: { items: true } });
      if (!purchase) return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 });
      if (purchase.status === "cancelled") return NextResponse.json({ error: "Compra cancelada" }, { status: 409 });
      const missing = purchase.items.some((i) => i.receivedQty < i.quantity);
      if (missing) return NextResponse.json({ error: "Todas las líneas deben estar recibidas por completo" }, { status: 409 });
      const p = await prisma.purchase.update({ where: { id: purchase.id }, data: { status: "completed" } });
      await audit({ action: "complete", resource: "purchases", resourceId: purchase.id, details: `Compra completada ${purchase.purchaseNumber}`, request });
      return NextResponse.json({ purchase: p });
    }

    if (body.action === "cancel") {
      const purchase = await prisma.purchase.findUnique({ where: { id: params.id } });
      if (!purchase) return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 });
      if (["completed", "cancelled"].includes(purchase.status)) {
        return NextResponse.json({ error: `No se puede cancelar una compra ${purchase.status}` }, { status: 409 });
      }
      const p = await prisma.$transaction(async (tx) => {
        const updated = await tx.purchase.update({ where: { id: purchase.id }, data: { status: "cancelled" } });
        if (purchase.supplierId) {
          await tx.supplier.update({ where: { id: purchase.supplierId }, data: { balance: { decrement: purchase.total } } });
        }
        return updated;
      });
      await audit({ action: "cancel", resource: "purchases", resourceId: purchase.id, details: `Compra cancelada ${purchase.purchaseNumber}`, request });
      return NextResponse.json({ purchase: p });
    }

    if (body.action === "pay") {
      const amount = Number(body.amount);
      if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
      const purchase = await prisma.purchase.findUnique({ where: { id: params.id } });
      if (!purchase) return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 });
      const remaining = purchase.total - purchase.amountPaid;
      if (amount > remaining + 0.01) return NextResponse.json({ error: `El monto supera el saldo pendiente (Gs ${Math.round(remaining).toLocaleString("es-PY")})` }, { status: 400 });

      const p = await prisma.$transaction(async (tx) => {
        const updated = await tx.purchase.update({
          where: { id: purchase.id },
          data: {
            amountPaid: Math.round((purchase.amountPaid + amount) * 100) / 100,
            paymentStatus: amount >= remaining - 0.01 ? "paid" : "partial",
          },
        });
        if (purchase.supplierId) {
          await tx.supplier.update({ where: { id: purchase.supplierId }, data: { balance: { decrement: amount } } });
        }
        return updated;
      });
      await audit({ action: "payment", resource: "purchases", resourceId: purchase.id, details: `Pago Gs ${Math.round(amount).toLocaleString("es-PY")} en ${purchase.purchaseNumber}`, request });
      return NextResponse.json({ purchase: p });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const purchase = await prisma.purchase.findUnique({ where: { id: params.id } });
    if (!purchase) return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 });
    if (purchase.status !== "draft") {
      return NextResponse.json({ error: "Solo se pueden eliminar compras en borrador" }, { status: 409 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.purchaseItem.deleteMany({ where: { purchaseId: purchase.id } });
      await tx.purchase.delete({ where: { id: purchase.id } });
      if (purchase.supplierId) {
        await tx.supplier.update({ where: { id: purchase.supplierId }, data: { balance: { decrement: purchase.total } } });
      }
    });
    await audit({ action: "delete", resource: "purchases", resourceId: purchase.id, details: `Compra eliminada ${purchase.purchaseNumber}`, request });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al eliminar compra" }, { status: 500 });
  }
}