import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";

const moveSchema = z.object({ type: z.enum(["INGRESO", "EGRESO"]), amount: z.number().positive(), category: z.string().optional(), description: z.string().optional() });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const session = await prisma.cashSession.findUnique({ where: { id: params.id }, include: { movements: true } });
    if (!session) return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });
    if (session.status !== "open") return NextResponse.json({ error: "La caja está cerrada" }, { status: 409 });

    if (body.action === "move") {
      const parsed = moveSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Tipo, monto y descripción requeridos" }, { status: 400 });
      const movement = await prisma.cashMovement.create({
        data: {
          sessionId: session.id,
          type: parsed.data.type,
          category: parsed.data.category || "general",
          amount: parsed.data.amount,
          description: parsed.data.description || null,
        },
      });
      await audit({ action: "cash", resource: "cash", resourceId: session.id, details: `${parsed.data.type} de Gs ${Math.round(parsed.data.amount).toLocaleString("es-PY")} (${parsed.data.category || "general"})`, request });
      return NextResponse.json({ movement }, { status: 201 });
    }

    if (body.action === "close") {
      const closingAmount = Number(body.closingAmount);
      if (isNaN(closingAmount) || closingAmount < 0) return NextResponse.json({ error: "Monto de cierre inválido" }, { status: 400 });
      const income = session.movements.filter((m) => m.type === "INGRESO").reduce((s, m) => s + m.amount, 0);
      const expense = session.movements.filter((m) => m.type === "EGRESO").reduce((s, m) => s + m.amount, 0);
      const expected = Math.round((session.openingAmount + income - expense) * 100) / 100;
      const updated = await prisma.cashSession.update({
        where: { id: session.id },
        data: { status: "closed", closedAt: new Date(), closingAmount, expectedAmount: expected, notes: body.notes || session.notes },
      });
      const diff = Math.round((closingAmount - expected) * 100) / 100;
      await audit({
        action: "close", resource: "cash", resourceId: session.id,
        details: `Cierre de caja: esperado Gs ${Math.round(expected).toLocaleString("es-PY")}, contado Gs ${Math.round(closingAmount).toLocaleString("es-PY")}, diferencia Gs ${Math.round(diff).toLocaleString("es-PY")}`,
        request,
      });
      return NextResponse.json({ session: updated, expected, diff });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}