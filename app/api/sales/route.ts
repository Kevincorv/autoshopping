import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";

const saleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.enum(["paid", "partial", "pending"]).default("paid"),
  paidAmount: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  shipping: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative().optional(),
  })).min(1),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase() || "";
    const status = url.searchParams.get("status") || "";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 200, 500);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (q) where.OR = [{ orderNumber: { contains: q } }, { customerName: { contains: q } }, { customerPhone: { contains: q } }];
    if (from || to) {
      where.createdAt = {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(new Date(to).setHours(23, 59, 59)) : undefined,
      };
    }

    const [sales, agg] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, customer: { select: { id: true, name: true, lastname: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.order.aggregate({
        where: { ...where, status: { not: "cancelled" } },
        _sum: { total: true, discount: true, amountPaid: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      sales,
      stats: {
        count: agg._count,
        total: agg._sum.total || 0,
        discount: agg._sum.discount || 0,
        paid: agg._sum.amountPaid || 0,
        pending: (agg._sum.total || 0) - (agg._sum.amountPaid || 0),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener ventas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = saleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos de venta inválidos (mínimo 1 ítem)" }, { status: 400 });
    const d = parsed.data;

    const products = await prisma.product.findMany({ where: { id: { in: d.items.map((i) => i.productId) } } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of d.items) {
      const p = productMap.get(item.productId);
      if (!p) return NextResponse.json({ error: "Producto no encontrado en catálogo" }, { status: 404 });
      if (p.stock < item.quantity) {
        return NextResponse.json({ error: `Stock insuficiente: ${p.name} (disponible ${p.stock} ${p.unit})` }, { status: 409 });
      }
      if (item.unitPrice === undefined) {
        if (!p.salePrice) return NextResponse.json({ error: `Sin precio de venta definido: ${p.name}` }, { status: 400 });
        item.unitPrice = p.salePrice;
      }
    }

    const saleCount = await prisma.order.count();
    const orderNumber = `VTA-${new Date().getFullYear()}-${String(saleCount + 1).padStart(4, "0")}`;
    const subtotal = Math.round(d.items.reduce((s, i) => s + i.quantity * i.unitPrice!, 0) * 100) / 100;
    const discount = Math.min(Math.round(d.discount * 100) / 100, subtotal);
    const total = Math.round((subtotal - discount + d.shipping) * 100) / 100;
    const initialPaid = d.paymentStatus === "paid" ? total : d.paymentStatus === "partial" ? Math.min(d.paidAmount, total) : 0;

    const sale = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          status: "completed",
          subtotal,
          discount,
          shipping: d.shipping,
          total,
          paymentMethod: d.paymentMethod || null,
          paymentStatus: d.paymentStatus,
          amountPaid: initialPaid,
          paidAt: d.paymentStatus === "paid" ? new Date() : initialPaid > 0 ? new Date() : null,
          customerId: d.customerId || null,
          customerName: d.customerName || "Cliente local",
          customerPhone: d.customerPhone || "—",
          customerEmail: "—",
          customerAddress: "Local",
          customerCity: "",
          notes: d.notes || null,
          items: {
            create: d.items.map((i) => {
              const p = productMap.get(i.productId)!;
              return {
                productId: p.id,
                productName: p.name,
                productSku: p.sku || "",
                quantity: i.quantity,
                unitPrice: i.unitPrice!,
                subtotal: Math.round(i.quantity * i.unitPrice! * 100) / 100,
              };
            }),
          },
          statusHistory: { create: { status: "completed", notes: "Venta registrada" } },
        },
      });

      for (const item of d.items) {
        const p = productMap.get(item.productId)!;
        const prev = p.stock;
        const next = Math.round((prev - item.quantity) * 100) / 100;
        await tx.product.update({ where: { id: p.id }, data: { stock: next, sold: { increment: Math.floor(item.quantity) } } });
        await tx.stockMovement.create({
          data: {
            productId: p.id,
            type: "SALIDA",
            quantity: item.quantity,
            reason: "VENTA",
            reference: orderNumber,
            unit: p.unit,
            unitCost: p.unitCost ?? p.lastPurchaseCost ?? null,
            stockBefore: prev,
            stockAfter: next,
            notes: `Venta ${orderNumber}`,
          },
        });
      }

      if (d.customerId && d.paymentStatus !== "paid") {
        const owed = total - initialPaid;
        await tx.customer.update({
          where: { id: d.customerId },
          data: { balance: { increment: owed }, totalPurchases: { increment: 1 } },
        });
        if (owed > 0) {
          await tx.receivablePayment.create({
            data: { customerId: d.customerId, type: "cargo", amount: owed, method: d.paymentMethod || null, reference: orderNumber, notes: "Venta a crédito" },
          });
        }
      }
      if (d.customerId && d.paymentStatus === "paid") {
        await tx.customer.update({ where: { id: d.customerId }, data: { totalPurchases: { increment: 1 } } });
      }

      return order;
    });

    await audit({ action: "create", resource: "sales", resourceId: sale.id, details: `Venta ${orderNumber} por Gs ${Math.round(total).toLocaleString("es-PY")}`, request });
    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al registrar la venta" }, { status: 500 });
  }
}