import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { AUTH_ROLES_ERP } from "@/lib/constants";
import { sanitizeText } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { sendEmail, orderStatusEmail } from "@/lib/email";

const VALID_STATUSES = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"];
const VALID_PAYMENT_STATUSES = ["pending", "partial", "paid", "refunded"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_ERP);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const { status, courier, trackingNumber, paymentStatus, paymentReference } = body || {};

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Estado inválido. Valores: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }
    if (paymentStatus !== undefined && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      return NextResponse.json({ error: `Estado de pago inválido. Valores: ${VALID_PAYMENT_STATUSES.join(", ")}` }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(status ? { status, ...(status === "delivered" ? { deliveredAt: new Date() } : {}) } : {}),
        ...(courier !== undefined ? { courier: courier ? sanitizeText(courier, 80) : null } : {}),
        ...(trackingNumber !== undefined ? { trackingNumber: trackingNumber ? sanitizeText(trackingNumber, 80) : null } : {}),
        ...(paymentStatus !== undefined
          ? {
              paymentStatus,
              ...(paymentStatus === "paid" && !order.paidAt
                ? { amountPaid: order.total, paidAt: new Date() }
                : {}),
            }
          : {}),
        ...(paymentReference !== undefined
          ? { paymentReference: paymentReference ? sanitizeText(paymentReference, 120) : null }
          : {}),
        ...(status
          ? {
              statusHistory: {
                create: { status, changedBy: auth.payload.email, notes: `Estado cambiado a ${status}` },
              },
            }
          : {}),
      },
      include: { items: true, statusHistory: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    await audit({
      action: "update",
      resource: "orders",
      resourceId: order.id,
      details: `Pedido ${order.orderNumber}: ${status ? `estado → ${status}` : ""}${paymentStatus ? `${status ? ", " : ""}pago → ${paymentStatus}` : ""}${courier !== undefined ? `, transportista → ${courier || "—"}` : ""}${trackingNumber !== undefined ? `, tracking → ${trackingNumber || "—"}` : ""}`,
      request,
    });

    if (status && status !== order.status && status !== "pending") {
      sendEmail(
        orderStatusEmail({
          to: order.customerEmail,
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          status,
          courier: updated.courier,
          trackingNumber: updated.trackingNumber,
          trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/track/${order.orderNumber}`,
        })
      ).catch(() => {});
    }

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "Error al actualizar pedido" }, { status: 500 });
  }
}
