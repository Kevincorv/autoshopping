import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body || {};
    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "Endpoint requerido" }, { status: 400 });
    }
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json({ error: "Error al desuscribir" }, { status: 500 });
  }
}
