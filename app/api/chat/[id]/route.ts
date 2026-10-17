import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth/jwt";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { cookies } from "next/headers";
import { sanitizeText } from "@/lib/validation";
import { rateLimit } from "@/lib/auth/rate-limit";
import { isErpRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

async function getSessionUserSafe() {
  try {
    const token = cookies().get(AUTH_CONFIG.cookieName)?.value;
    const payload = token ? await verifySessionToken(token) : null;
    if (!payload?.userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: { select: { name: true } } },
    });
    if (!user) return null;
    return { id: user.id, email: user.email, roleName: user.role?.name || "" };
  } catch {
    return null;
  }
}

async function canAccess(session: { userId: string | null; guestEmail: string | null }, user: { id: string; email: string; roleName: string } | null) {
  if (!user) return false;
  if (isErpRole(user.roleName)) return true;
  if (session.userId && session.userId === user.id) return true;
  if (session.guestEmail && session.guestEmail === user.email) return true;
  return false;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUserSafe();
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: params.id },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
    });
    if (!session) return NextResponse.json({ error: "Chat no encontrado" }, { status: 404 });
    if (!(await canAccess(session, user))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "Error al cargar chat" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUserSafe();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const limiter = rateLimit(`chat-msg:${ip}`, 30, 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Demasiados mensajes. Esperá un momento." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const text = sanitizeText(String(body?.message || ""), 1000).trim();
    if (!text) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

    const session = await prisma.chatSession.findUnique({ where: { id: params.id } });
    if (!session) return NextResponse.json({ error: "Chat no encontrado" }, { status: 404 });
    if (!(await canAccess(session, user))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (session.status === "closed") {
      return NextResponse.json({ error: "El chat está cerrado" }, { status: 400 });
    }

    const message = await prisma.chatMessage.create({
      data: { sessionId: session.id, sender: "customer", body: text },
    });
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { unreadAdmin: { increment: 1 }, lastMessageAt: new Date() },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al enviar mensaje" }, { status: 500 });
  }
}
