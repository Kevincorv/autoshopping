import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

const schema = z.object({
  type: z.enum(["cargo", "pago"]),
  amount: z.number().positive(),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    const d = parsed.data;
    const session = await getSessionUser();

    const customer = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!customer) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    const delta = d.type === "cargo" ? d.amount : -d.amount;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.receivablePayment.create({
        data: {
          customerId: customer.id,
          type: d.type,
          amount: d.amount,
          method: d.method || null,
          reference: d.reference || null,
          notes: d.notes || null,
          createdBy: session?.userId || null,
        },
      });
      return tx.customer.update({
        where: { id: customer.id },
        data: { balance: Math.max(0, Math.round((customer.balance + delta) * 100) / 100) },
      });
    });

    await audit({
      action: d.type === "cargo" ? "charge" : "payment",
      resource: "receivables",
      resourceId: customer.id,
      details: `${d.type === "cargo" ? "Cargo" : "Pago"}: Gs. ${d.amount} — ${d.method || "sin método"} ${d.notes ? "| " + d.notes : ""}`,
      request,
    });

    return NextResponse.json({ customer: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al registrar movimiento" }, { status: 500 });
  }
}