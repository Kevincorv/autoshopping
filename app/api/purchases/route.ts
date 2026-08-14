import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  shippingCost: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().optional(),
    productName: z.string().min(1),
    quantity: z.number().positive(),
    unitCost: z.number().nonnegative(),
    notes: z.string().optional(),
  })).min(1),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase() || "";
    const status = url.searchParams.get("status") || "";
    const supplierId = url.searchParams.get("supplierId") || "";
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 200, 500);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (q) where.OR = [{ purchaseNumber: { contains: q } }, { supplier: { name: { contains: q } } }, { invoiceNumber: { contains: q } }];
    if (dateFrom || dateTo) {
      where.createdAt = {
        gte: dateFrom ? new Date(dateFrom) : undefined,
        lte: dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59)) : undefined,
      };
    }

    const [purchases, agg] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } }, _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.purchase.aggregate({ where, _sum: { total: true, amountPaid: true }, _count: true }),
    ]);

    return NextResponse.json({
      purchases,
      stats: {
        count: agg._count,
        total: agg._sum.total || 0,
        paid: agg._sum.amountPaid || 0,
        pending: (agg._sum.total || 0) - (agg._sum.amountPaid || 0),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener compras" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos de compra inválidos (mínimo 1 ítem con cantidad y costo)" }, { status: 400 });
    const d = parsed.data;

    let supplierId: string | null = d.supplierId || null;
    if (!supplierId && d.supplierName) {
      const count = await prisma.supplier.count();
      const sup = await prisma.supplier.create({
        data: { code: `PROV-${String(count + 1).padStart(3, "0")}`, name: d.supplierName },
      });
      supplierId = sup.id;
    }

    const purchaseCount = await prisma.purchase.count();
    const purchaseNumber = `OC${String(purchaseCount + 1).padStart(5, "0")}`;
    const itemTotal = d.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    const total = Math.round((itemTotal + d.shippingCost) * 100) / 100;
    const subtotal = Math.round(itemTotal * 100) / 100;

    const purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.purchase.create({
        data: {
          purchaseNumber,
          invoiceNumber: d.invoiceNumber || null,
          shippingCost: d.shippingCost,
          supplierId,
          status: "ordered",
          subtotal,
          discount: 0,
          tax: 0,
          total,
          notes: d.notes || null,
          items: {
            create: d.items.map((i) => ({
              productId: i.productId || null,
              productName: i.productName,
              productSku: "",
              quantity: i.quantity,
              receivedQty: 0,
              unitCost: i.unitCost,
              subtotal: Math.round(i.quantity * i.unitCost * 100) / 100,
              notes: i.notes || null,
            })),
          },
        },
      });
      if (supplierId) {
        await tx.supplier.update({ where: { id: supplierId }, data: { balance: { increment: total } } });
      }
      return p;
    });

    await audit({ action: "create", resource: "purchases", resourceId: purchase.id, details: `Compra creada ${purchaseNumber} por Gs ${Math.round(total).toLocaleString("es-PY")}`, request });
    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear compra" }, { status: 500 });
  }
}