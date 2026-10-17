import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { AUTH_ROLES_ERP } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth/session";
import { sanitizeText } from "@/lib/validation";
import { rateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_ERP);
  if (auth.response) return auth.response;
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: params.id },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 500 },
        customer: { select: { name: true, lastname: true, email: true } },
      },
    });
    if (!session) return NextResponse.json({ error: "Chat no encontrado" }, { status: 404 });
    await prisma.chatSession.update({ where: { id: session.id }, data: { unreadAdmin: 0 } });
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "Error al cargar chat" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_ERP);
  if (auth.response) return auth.response;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const limiter = rateLimit(`chat-admin:${ip}`, 60, 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Demasiados mensajes" }, { status: 429 });
  }
  try {
    const body = await request.json();
    const text = sanitizeText(String(body?.message || ""), 1000).trim();
    if (!text) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

    const session = await prisma.chatSession.findUnique({ where: { id: params.id } });
    if (!session) return NextResponse.json({ error: "Chat no encontrado" }, { status: 404 });

    const message = await prisma.chatMessage.create({
      data: { sessionId: session.id, sender: "admin", body: text },
    });
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { unreadCustomer: { increment: 1 }, lastMessageAt: new Date() },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al enviar mensaje" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_ERP);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const status = body?.status === "closed" ? "closed" : body?.status === "open" ? "open" : null;
    if (!status) return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    const session = await prisma.chatSession.update({ where: { id: params.id }, data: { status } });
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "Error al actualizar chat" }, { status: 500 });
  }
}
