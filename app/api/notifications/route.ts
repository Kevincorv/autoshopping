import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const unread = notifications.filter((n) => !n.isRead).length;
    return NextResponse.json({ notifications, unread });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener notificaciones" }, { status: 500 });
  }
}

const createSchema = z.object({
  userId: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Destinatario, tipo, título y mensaje requeridos" }, { status: 400 });
    const notification = await prisma.notification.create({ data: parsed.data });
    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear notificación" }, { status: 500 });
  }
}