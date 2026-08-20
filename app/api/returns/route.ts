import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";

const returnSchema = z.object({
  orderId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  reason: z.string().min(1),
  items: z.array(z.object({
    productId: z.string().optional(),
    productName: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative().default(0),
    condition: z.enum(["bueno", "dañado"]).default("bueno"),
  })).min(1),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase() || "";
    const status = url.searchParams.get("status") || "";
    const limit = Math.min(Number(url.searchParams.get("limit")) || 200, 500);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (q) where.OR = [{ returnNumber: { contains: q } }, { customerName: { contains: q } }, { order: { orderNumber: { contains: q } } }];

    const [returns, agg] = await Promise.all([
      prisma.returnOrder.findMany({
        where,
        include: { items: true, order: { select: { orderNumber: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.returnOrder.aggregate({ where: { status: { not: "cancelled" } }, _sum: { refundAmount: true }, _count: true }),
    ]);
    return NextResponse.json({ returns, stats: { count: agg._count, refunded: agg._sum.refundAmount || 0 } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener devoluciones" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = returnSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Motivo y al menos 1 ítem requeridos" }, { status: 400 });
    const d = parsed.data;

    const last = await prisma.returnOrder.findFirst({ orderBy: { returnNumber: "desc" }, select: { returnNumber: true } });
    const lastSeq = last ? parseInt(last.returnNumber.replace("DEV-", ""), 10) || 0 : 0;
    const returnNumber = `DEV-${String(lastSeq + 1).padStart(5, "0")}`;
    const refundAmount = Math.round(d.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100;

    const ret = await prisma.$transaction(async (tx) => {
      const r = await tx.returnOrder.create({
        data: {
          returnNumber,
          orderId: d.orderId || null,
          customerId: d.customerId || null,
          customerName: d.customerName || null,
          status: "pending",
          reason: d.reason,
          refundAmount,
          items: {
            create: d.items.map((i) => ({
              productId: i.productId || null,
              productName: i.productName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              condition: i.condition,
            })),
          },
        },
      });

      for (const item of d.items) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        const prev = product.stock;
        const next = Math.round((prev + item.quantity) * 100) / 100;
        await tx.product.update({ where: { id: product.id }, data: { stock: next } });
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "ENTRADA",
            quantity: item.quantity,
            reason: "DEVOLUCIÓN",
            reference: returnNumber,
            unit: product.unit,
            unitCost: product.unitCost ?? null,
            stockBefore: prev,
            stockAfter: next,
            notes: item.condition === "dañado" ? "Producto dañado (revisar antes de revender)" : `Ingreso por ${returnNumber}`,
          },
        });
      }

      if (d.customerId) {
        await tx.customer.update({ where: { id: d.customerId }, data: { balance: { decrement: refundAmount } } });
        if (refundAmount > 0) {
          await tx.receivablePayment.create({
            data: { customerId: d.customerId, type: "pago", amount: refundAmount, reference: returnNumber, notes: "Devolución" },
          });
        }
      }

      return r;
    });

    await audit({ action: "create", resource: "returns", resourceId: ret.id, details: `Devolución ${returnNumber} por Gs ${Math.round(refundAmount).toLocaleString("es-PY")} (${d.reason})`, request });
    return NextResponse.json({ ret }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al registrar devolución" }, { status: 500 });
  }
}