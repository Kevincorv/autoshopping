import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/middleware";
import { sendPushToAll, isPushConfigured } from "@/lib/push";
import { sanitizeText } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: "Push no configurado. Generá las VAPID keys y agregalas a .env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const title = sanitizeText(String(body?.title || "AutoShopping"), 120);
    const text = sanitizeText(String(body?.body || ""), 250);
    const url = body?.url ? sanitizeText(String(body.url), 300) : "/";
    if (!text) {
      return NextResponse.json({ error: "El mensaje es obligatorio" }, { status: 400 });
    }

    const result = await sendPushToAll({ title, body: text, url });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: "Error al enviar notificaciones" }, { status: 500 });
  }
}
