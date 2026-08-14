import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Estado inválido. Valores: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        status,
        ...(status === "delivered" ? { deliveredAt: new Date() } : {}),
        statusHistory: {
          create: { status, changedBy: "admin", notes: `Estado cambiado a ${status}` },
        },
      },
      include: { items: true, statusHistory: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "Error al actualizar pedido" }, { status: 500 });
  }
}
