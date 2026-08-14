import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "sales";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const productId = searchParams.get("productId") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;

    const where: any = {};
    if (dateFrom) where.createdAt = { ...(where.createdAt || {}), gte: new Date(dateFrom) };
    if (dateTo) where.createdAt = { ...(where.createdAt || {}), lte: new Date(dateTo + "T23:59:59.999Z") };

    if (type === "sales") {
      const orders = await prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });

      const items = orders.flatMap((o) => o.items);
      const totalSales = orders.reduce((s, o) => s + o.total, 0);
      const totalItems = items.reduce((s, i) => s + i.quantity, 0);

      return NextResponse.json({
        totalSales,
        totalOrders: orders.length,
        totalItems,
        items: items.slice(0, 200),
        orders: orders.map((o) => ({
          id: o.id, orderNumber: o.orderNumber, customerName: o.customerName,
          total: o.total, status: o.status, createdAt: o.createdAt,
        })),
      });
    }

    if (type === "financial") {
      const orders = await prisma.order.findMany({ where });
      const totalSales = orders.reduce((s, o) => s + o.total, 0);
      return NextResponse.json({ totalSales, totalOrders: orders.length });
    }

    if (type === "inventory") {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, sku: true, price: true, stock: true, isActive: true },
        orderBy: { name: "asc" },
      });

      const stats = {
        totalStock: products.reduce((s, p) => s + p.stock, 0),
        totalValue: products.reduce((s, p) => s + p.price * p.stock, 0),
        activeProducts: products.filter((p) => p.isActive).length,
        outOfStock: products.filter((p) => p.stock === 0).length,
      };

      return NextResponse.json({ products, stats });
    }

    return NextResponse.json({ error: "Tipo de reporte inválido" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Error al generar reporte" }, { status: 500 });
  }
}
