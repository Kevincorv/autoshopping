import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true, createdAt: true },
        },
        receivablePayments: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!customer) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    return NextResponse.json({ customer });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener cliente" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const session = await getSessionUser();
    const customer = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!customer) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof body.notes === "string") data.notes = body.notes;
    if (typeof body.phone === "string") data.phone = body.phone;
    if (typeof body.whatsapp === "string") data.whatsapp = body.whatsapp || null;
    if (typeof body.city === "string") data.city = body.city || null;
    if (typeof body.address === "string") data.address = body.address || null;
    if (typeof body.isBlocked === "boolean") {
      data.isBlocked = body.isBlocked;
      data.blockedReason = body.isBlocked ? body.blockedReason || "Bloqueado por administrador" : null;
    }

    const updated = await prisma.customer.update({ where: { id: params.id }, data });

    await audit({
      action: "update",
      resource: "customers",
      resourceId: updated.id,
      details: JSON.stringify({ changed: Object.keys(data), blocked: data.isBlocked ?? undefined }),
      request,
    });

    return NextResponse.json({ customer: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
  }
}