import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, lastname: true, email: true, phone: true, isActive: true, createdAt: true, role: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}
