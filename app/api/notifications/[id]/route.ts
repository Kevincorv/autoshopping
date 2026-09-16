import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/middleware";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request as any);
    if (auth.response) return auth.response;
    const body = await request.json();
    const notification = await prisma.notification.update({
      where: { id: params.id },
      data: { isRead: body.isRead !== undefined ? !!body.isRead : true },
    });
    return NextResponse.json({ notification });
  } catch {
    return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
  }
}