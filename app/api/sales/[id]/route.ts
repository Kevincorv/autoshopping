import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireRole, requirePermission } from "@/lib/auth/middleware";
import { AUTH_ROLES_SALES_READ } from "@/lib/constants";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRole(_request as NextRequest, ...AUTH_ROLES_SALES_READ);
    if (auth.response) return auth.response;

    const sale = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true, payments: true, customer: { select: { id: true, name: true, lastname: true, phone: true, email: true } } },
    });
    if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    return NextResponse.json({ sale });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener venta" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRole(request as NextRequest, ...AUTH_ROLES_SALES_READ);
    if (auth.response) return auth.response;

    const body = await request.json();
    const sale = await prisma.order.findUnique({ where: { id: params.id } });
    if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });

    if (body.action === "cancel" && auth.payload.roleName !== "admin" && auth.payload.roleName !== "accountant") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    if (body.action === "pay") {
      const amount = Math.round(Number(body.amount) * 100) / 100;
      if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
      const remaining = sale.total - sale.amountPaid;
      if (amount > remaining + 0.01) return NextResponse.json({ error: `Monto supera el saldo (Gs ${Math.round(remaining).toLocaleString("es-PY")})` }, { status: 400 });

      const updated = await prisma.$transaction(async (tx) => {
        const order = await tx.order.update({
          where: { id: sale.id },
          data: {
            amountPaid: Math.round((sale.amountPaid + amount) * 100) / 100,
            paymentStatus: amount >= remaining - 0.01 ? "paid" : "partial",
            paidAt: new Date(),
          },
        });
        await tx.payment.create({
          data: { orderId: sale.id, gateway: "manual", amount, status: "completed" },
        });
        if (sale.customerId) {
          await tx.customer.update({ where: { id: sale.customerId }, data: { balance: { decrement: amount } } });
          await tx.receivablePayment.create({
            data: { customerId: sale.customerId, type: "pago", amount, method: body.method || null, reference: sale.orderNumber, notes: "Pago registrado" },
          });
        }
        return order;
      });
      await audit({ action: "payment", resource: "sales", resourceId: sale.id, details: `Pago Gs ${Math.round(amount).toLocaleString("es-PY")} en ${sale.orderNumber}`, request });
      return NextResponse.json({ sale: updated });
    }

    if (body.action === "cancel") {
      if (sale.status === "cancelled") return NextResponse.json({ error: "Ya está cancelada" }, { status: 409 });
      const updated = await prisma.$transaction(async (tx) => {
        const order = await tx.order.update({ where: { id: sale.id }, data: { status: "cancelled" } });
        const items = await tx.orderItem.findMany({ where: { orderId: sale.id } });
        for (const item of items) {
          const product = item.productId ? await tx.product.findUnique({ where: { id: item.productId } }) : null;
          if (!product) continue;
          const prev = product.stock;
          const next = Math.round((prev + item.quantity) * 100) / 100;
          await tx.product.update({ where: { id: product.id }, data: { stock: next } });
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: "ENTRADA",
              quantity: item.quantity,
              reason: "ANULACIÓN",
              reference: sale.orderNumber,
              unit: product.unit,
              stockBefore: prev,
              stockAfter: next,
              notes: `Venta anulada ${sale.orderNumber}`,
            },
          });
        }
        if (sale.customerId) {
          const remaining = sale.total - sale.amountPaid;
          await tx.customer.update({ where: { id: sale.customerId }, data: { balance: { decrement: remaining } } });
          if (remaining > 0) {
            await tx.receivablePayment.create({
              data: { customerId: sale.customerId, type: "pago", amount: remaining, reference: sale.orderNumber, notes: "Anulación de venta" },
            });
          }
        }
        return order;
      });
      await audit({ action: "cancel", resource: "sales", resourceId: sale.id, details: `Venta anulada ${sale.orderNumber}`, request });
      return NextResponse.json({ sale: updated });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission(request as NextRequest, "sales.void");
    if (auth.response) return auth.response;

    const sale = await prisma.order.findUnique({ where: { id: params.id }, include: { _count: { select: { payments: true } } } });
    if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    if (sale.paymentStatus !== "pending" || sale._count.payments > 0) {
      return NextResponse.json({ error: "Solo se puede eliminar una venta sin pagos registrados" }, { status: 409 });
    }
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: sale.id } }),
      prisma.orderStatusHistory.deleteMany({ where: { orderId: sale.id } }),
      prisma.order.delete({ where: { id: sale.id } }),
    ]);
    await audit({ action: "delete", resource: "sales", resourceId: sale.id, details: `Venta eliminada ${sale.orderNumber}`, request });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al eliminar venta" }, { status: 500 });
  }
}