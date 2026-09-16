import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
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