import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const user = await prisma.user.update({ where: { id: params.id }, data: body });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}
