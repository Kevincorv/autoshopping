import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener configuraciones" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
