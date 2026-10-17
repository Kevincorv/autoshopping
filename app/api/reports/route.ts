import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

function buildWhere(dateFrom: string | null, dateTo: string | null) {
  const where: any = {};
  if (dateFrom) where.createdAt = { ...(where.createdAt || {}), gte: new Date(dateFrom) };
  if (dateTo) where.createdAt = { ...(where.createdAt || {}), lte: new Date(dateTo + "T23:59:59.999Z") };
  return where;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "sales";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where = buildWhere(dateFrom, dateTo);

    if (type === "sales") {
      const [orderAgg, itemAgg, orders, items] = await Promise.all([
        prisma.order.aggregate({ where, _sum: { total: true, discount: true }, _count: true }),
        prisma.orderItem.aggregate({
          where: { order: where },
          _sum: { quantity: true, subtotal: true },
        }),
        prisma.order.findMany({
          where,
          select: { id: true, orderNumber: true, customerName: true, total: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
        prisma.orderItem.findMany({
          where: { order: where },
          select: { id: true, orderId: true, productId: true, productName: true, productSku: true, quantity: true, unitPrice: true, unitCost: true, subtotal: true },
          orderBy: { subtotal: "desc" },
          take: 200,
        }),
      ]);

      const costRows = await prisma.orderItem.findMany({
        where: { order: where },
        select: { subtotal: true, quantity: true, unitCost: true },
      });
      let totalCost = 0;
      for (const r of costRows) {
        totalCost += r.unitCost != null ? r.unitCost * r.quantity : 0;
      }
      const totalSales = orderAgg._sum.total ?? 0;
      const totalRevenue = itemAgg._sum.subtotal ?? 0;

      return NextResponse.json({
        totalSales,
        totalOrders: orderAgg._count,
        totalItems: itemAgg._sum.quantity ?? 0,
        totalDiscount: orderAgg._sum.discount ?? 0,
        totalCost: Math.round(totalCost),
        grossProfit: Math.round(totalRevenue - totalCost),
        items,
        orders,
      });
    }

    if (type === "financial") {
      const [agg, byPayment] = await Promise.all([
        prisma.order.aggregate({ where, _sum: { total: true, discount: true }, _count: true }),
        prisma.order.groupBy({
          by: ["paymentStatus"],
          where,
          _sum: { total: true },
          _count: true,
        }),
      ]);

      const costRows = await prisma.orderItem.findMany({
        where: { order: where },
        select: { subtotal: true, quantity: true, unitCost: true },
      });
      let totalCost = 0;
      let revenue = 0;
      for (const r of costRows) {
        revenue += r.subtotal;
        totalCost += r.unitCost != null ? r.unitCost * r.quantity : 0;
      }

      return NextResponse.json({
        totalSales: agg._sum.total ?? 0,
        totalOrders: agg._count,
        totalDiscount: agg._sum.discount ?? 0,
        totalCost: Math.round(totalCost),
        grossProfit: Math.round(revenue - totalCost),
        byPaymentStatus: byPayment.map((g) => ({
          paymentStatus: g.paymentStatus,
          total: g._sum.total ?? 0,
          count: g._count,
        })),
      });
    }

    if (type === "inventory") {
      const [statsAgg, outOfStock, inventoryValue] = await Promise.all([
        prisma.product.aggregate({
          where: { isActive: true },
          _sum: { stock: true },
          _count: true,
        }),
        prisma.product.count({ where: { isActive: true, stock: 0 } }),
        prisma.$queryRawUnsafe<[{ value: number | null }]>(
          "SELECT COALESCE(SUM(price * stock), 0) AS value FROM Product WHERE isActive = true"
        ),
      ]);

      const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, sku: true, price: true, stock: true, isActive: true },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({
        products,
        stats: {
          totalStock: statsAgg._sum.stock ?? 0,
          totalValue: Number(inventoryValue[0]?.value ?? 0),
          activeProducts: statsAgg._count,
          outOfStock,
        },
      });
    }

    return NextResponse.json({ error: "Tipo de reporte inválido" }, { status: 400 });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: "Error al generar reporte" }, { status: 500 });
  }
}
