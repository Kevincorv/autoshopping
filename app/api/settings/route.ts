import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener configuraciones" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const { settings } = body;
    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }
    const promises = Object.entries(settings).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );
    await Promise.all(promises);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al guardar configuraciones" }, { status: 500 });
  }
}
