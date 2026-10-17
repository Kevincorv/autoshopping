import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth/jwt";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { cookies } from "next/headers";
import { sanitizeText } from "@/lib/validation";
import { rateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

async function getSessionUserSafe() {
  try {
    const token = cookies().get(AUTH_CONFIG.cookieName)?.value;
    const payload = token ? await verifySessionToken(token) : null;
    if (!payload?.userId) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, lastname: true, email: true },
    });
    return user;
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getSessionUserSafe();
  if (!user) {
    return NextResponse.json({ sessions: [] });
  }
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { OR: [{ userId: user.id }, { guestEmail: user.email }] },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
      take: 10,
    });
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const limiter = rateLimit(`chat-create:${ip}`, 5, 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un minuto." }, { status: 429 });
  }
  try {
    const user = await getSessionUserSafe();
    const body = await request.json().catch(() => ({}));
    const guestName = sanitizeText(String(body?.name || ""), 80).trim();
    const guestEmail = sanitizeText(String(body?.email || ""), 120).trim().toLowerCase();
    const firstMessage = sanitizeText(String(body?.message || ""), 1000).trim();

    let session;
    if (user) {
      session = await prisma.chatSession.findFirst({
        where: { userId: user.id, status: "open" },
      });
      if (!session) {
        session = await prisma.chatSession.create({
          data: { userId: user.id, guestName: `${user.name} ${user.lastname}`.trim(), guestEmail: user.email },
        });
      }
    } else {
      if (!guestName || !firstMessage) {
        return NextResponse.json({ error: "Nombre y mensaje son obligatorios" }, { status: 400 });
      }
      session = await prisma.chatSession.create({
        data: { guestName, guestEmail: guestEmail || null },
      });
    }

    if (firstMessage) {
      await prisma.chatMessage.create({ data: { sessionId: session.id, sender: "customer", body: firstMessage } });
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { unreadAdmin: { increment: 1 }, lastMessageAt: new Date() },
      });
    }

    const full = await prisma.chatSession.findUnique({
      where: { id: session.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({ session: full }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al iniciar chat" }, { status: 500 });
  }
}
