import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  try {
    const open = await prisma.cashSession.findFirst({ where: { status: "open" }, include: { movements: { orderBy: { createdAt: "desc" }, take: 100 } } });
    const sessions = await prisma.cashSession.findMany({ orderBy: { openedAt: "desc" }, take: 10, include: { _count: { select: { movements: true } } } });
    const all = await prisma.cashMovement.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ open, sessions, recent: all });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener caja" }, { status: 500 });
  }
}

const openSchema = z.object({ openingAmount: z.number().nonnegative().default(0), notes: z.string().optional() });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "open") {
      const parsed = openSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Monto inicial inválido" }, { status: 400 });
      const existing = await prisma.cashSession.findFirst({ where: { status: "open" } });
      if (existing) return NextResponse.json({ error: "Ya hay una caja abierta" }, { status: 409 });
      const session = await prisma.cashSession.create({
        data: { openingAmount: parsed.data.openingAmount, notes: parsed.data.notes || null },
      });
      return NextResponse.json({ session }, { status: 201 });
    }
    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al abrir caja" }, { status: 500 });
  }
}