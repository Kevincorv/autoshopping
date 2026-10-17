import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, p256dh, auth } = body || {};

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Datos de suscripción incompletos" }, { status: 400 });
    }
    if (typeof endpoint !== "string" || endpoint.length > 1000) {
      return NextResponse.json({ error: "Endpoint inválido" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent");

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: sanitizeText(String(p256dh), 300), auth: sanitizeText(String(auth), 300), userAgent: userAgent ? sanitizeText(userAgent, 300) : null },
      create: {
        endpoint,
        p256dh: sanitizeText(String(p256dh), 300),
        auth: sanitizeText(String(auth), 300),
        userAgent: userAgent ? sanitizeText(userAgent, 300) : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: "Error al suscribir" }, { status: 500 });
  }
}
