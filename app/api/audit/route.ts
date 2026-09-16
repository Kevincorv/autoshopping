import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const logs = await prisma.auditLog.findMany({
      select: { id: true, action: true, resource: true, resourceId: true, details: true, ipAddress: true, createdAt: true, user: { select: { name: true, lastname: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener auditoría" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const log = await prisma.auditLog.create({ data: body });
    return NextResponse.json({ log });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear registro de auditoría" }, { status: 500 });
  }
}
