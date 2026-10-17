import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { orderNumber: string } }) {
  const ip = getClientIp(request);
  const limiter = rateLimit(`track:${ip || "unknown"}`, 60, 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Demasiadas consultas. Esperá un minuto." }, { status: 429 });
  }

  try {
    const orderNumber = (params.orderNumber || "").trim().toUpperCase();
    if (!orderNumber || orderNumber.length > 60) {
      return NextResponse.json({ error: "Número de pedido inválido" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { select: { productName: true, quantity: true, productSku: true } },
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "No encontramos un pedido con ese número" }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        subtotal: order.subtotal,
        discount: order.discount,
        shipping: order.shipping,
        total: order.total,
        courier: order.courier,
        trackingNumber: order.trackingNumber,
        createdAt: order.createdAt.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString() || null,
        customerName: order.customerName,
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
        })),
        history: order.statusHistory.map((h) => ({
          status: h.status,
          notes: h.notes,
          createdAt: h.createdAt.toISOString(),
        })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al consultar el pedido" }, { status: 500 });
  }
}
