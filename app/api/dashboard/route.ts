import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    const startWeek = new Date(startToday);
    startWeek.setDate(startWeek.getDate() - startWeek.getDay());
    const startLastWeek = new Date(startWeek);
    startLastWeek.setDate(startLastWeek.getDate() - 7);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      allOrders,
      todayOrders,
      yesterdayOrders,
      weekOrders,
      lastWeekOrders,
      monthOrders,
      lastMonthOrders,
    ] = await Promise.all([
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.order.findMany({ where: { createdAt: { gte: startToday } } }),
      prisma.order.findMany({ where: { createdAt: { gte: startYesterday, lt: startToday } } }),
      prisma.order.findMany({ where: { createdAt: { gte: startWeek } } }),
      prisma.order.findMany({ where: { createdAt: { gte: startLastWeek, lt: startWeek } } }),
      prisma.order.findMany({ where: { createdAt: { gte: startMonth } } }),
      prisma.order.findMany({ where: { createdAt: { gte: startLastMonth, lt: startMonth } } }),
    ]);

    const calcTotal = (rows: { total: number }[]) => rows.reduce((s, o) => s + o.total, 0);
    const salesToday = calcTotal(todayOrders);
    const salesYesterday = calcTotal(yesterdayOrders);
    const salesWeek = calcTotal(weekOrders);
    const salesLastWeek = calcTotal(lastWeekOrders);
    const salesMonth = calcTotal(monthOrders);
    const salesLastMonth = calcTotal(lastMonthOrders);

    const allTimeAgg = await prisma.order.aggregate({ _sum: { total: true } });
    const totalSalesAllTime = allTimeAgg._sum.total || 0;

    const countByStatus = (orders: { status: string }[]) => {
      const counts: Record<string, number> = { pending: 0, confirmed: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0 };
      orders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
      return counts;
    };
    const allTimeCounts = countByStatus(await prisma.order.findMany({ select: { status: true } }));

    const [totalProducts, activeProducts, outOfStockProducts, lowStockProducts] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { stock: 0, isActive: true } }),
      prisma.product.count({ where: { stock: { lte: 5, gt: 0 }, isActive: true } }),
    ]);

    const [topProducts, lowStock, totalCustomers] = await Promise.all([
      prisma.product.findMany({
        orderBy: { sold: "desc" },
        take: 10,
        select: { id: true, name: true, sold: true, price: true, stock: true, sku: true, brand: { select: { name: true } } },
      }),
      prisma.product.findMany({
        where: { stock: { lte: 10 }, isActive: true },
        select: { id: true, name: true, stock: true, sku: true },
        orderBy: { stock: "asc" },
        take: 10,
      }),
      prisma.customer.count(),
    ]);

    const newCustomersThisMonth = await prisma.customer.count({
      where: { createdAt: { gte: startMonth } },
    });

    const frequentCustomers = await prisma.customer.count({
      where: { totalPurchases: { gte: 3 } },
    });

    const guestCheckouts = await prisma.order.count({
      where: { customerId: null },
    });

    const avgAgg = await prisma.order.aggregate({ _avg: { total: true } });
    const averageTicket = avgAgg._avg.total || 0;

    const inventoryAgg = await prisma.product.aggregate({
      _sum: { stock: true },
      where: { isActive: true },
    });
    const totalUnits = inventoryAgg._sum.stock || 0;

    const inventoryProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: { price: true, stock: true },
    });
    const totalInventoryValue = inventoryProducts.reduce((s, p) => s + p.price * p.stock, 0);

    const highRotation = await prisma.product.findMany({
      where: { sold: { gt: 0 }, isActive: true },
      orderBy: { sold: "desc" },
      take: 5,
      select: { id: true, name: true, sold: true, stock: true },
    });

    const noMovement = await prisma.product.findMany({
      where: { sold: 0, isActive: true },
      orderBy: { updatedAt: "asc" },
      take: 5,
      select: { id: true, name: true, stock: true, updatedAt: true },
    });

    const today = new Date();
    const salesByDay = await Promise.all(
      Array.from({ length: 14 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return prisma.order.aggregate({
          where: { createdAt: { gte: start, lt: end } },
          _sum: { total: true },
        }).then(r => ({
          date: start.toISOString().slice(0, 10),
          total: r._sum.total || 0,
        }));
      })
    );

    const salesByWeek = await Promise.all(
      Array.from({ length: 8 }, (_, i) => {
        const end = new Date(startWeek);
        end.setDate(end.getDate() - i * 7);
        const begin = new Date(end);
        begin.setDate(begin.getDate() - 7);
        return prisma.order.aggregate({
          where: { createdAt: { gte: begin, lt: end } },
          _sum: { total: true },
        }).then(r => ({
          week: begin.toISOString().slice(0, 10),
          total: r._sum.total || 0,
        }));
      })
    );

    const salesByMonth = await Promise.all(
      Array.from({ length: 12 }, (_, i) => {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        return prisma.order.aggregate({
          where: { createdAt: { gte: m, lt: new Date(now.getFullYear(), now.getMonth() - i + 1, 1) } },
          _sum: { total: true },
        }).then(r => ({
          month: m.toLocaleString("es-PY", { month: "short", year: "numeric" }),
          total: r._sum.total || 0,
        }));
      })
    );

    const categorySales = await prisma.orderItem.groupBy({
      by: ["productName"],
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });

    const catRevenue: Record<string, { sold: number; revenue: number }> = {};
    for (const item of categorySales) {
      const catName = item.productName;
      if (!catRevenue[catName]) catRevenue[catName] = { sold: 0, revenue: 0 };
      catRevenue[catName].sold += item._sum.quantity || 0;
      catRevenue[catName].revenue += item._sum.subtotal || 0;
    }

    const brandSalesData = await prisma.product.findMany({
      where: { sold: { gt: 0 }, isActive: true },
      select: { brand: { select: { name: true } }, sold: true, price: true },
    });
    const brandRevenue: Record<string, { sold: number; revenue: number }> = {};
    for (const p of brandSalesData) {
      const bName = p.brand.name;
      if (!brandRevenue[bName]) brandRevenue[bName] = { sold: 0, revenue: 0 };
      brandRevenue[bName].sold += p.sold;
      brandRevenue[bName].revenue += p.sold * p.price;
    }

    const customerGrowth = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        return prisma.customer.count({
          where: { createdAt: { gte: m, lt: new Date(now.getFullYear(), now.getMonth() - i + 1, 1) } },
        }).then(count => ({
          month: m.toLocaleString("es-PY", { month: "short", year: "2-digit" }),
          count,
        }));
      })
    );

    const recentActivity: any[] = [];

    const [purchasesMonth, supplierDebt, receivablesTotal, cashOpen, stockMovesToday] = await Promise.all([
      prisma.purchase.aggregate({
        where: { createdAt: { gte: startMonth }, status: { not: "cancelled" } },
        _sum: { total: true, amountPaid: true },
        _count: true,
      }),
      prisma.supplier.aggregate({ _sum: { balance: true } }),
      prisma.customer.aggregate({ _sum: { balance: true } }),
      prisma.cashSession.findFirst({ where: { status: "open" }, include: { movements: true } }),
      prisma.stockMovement.count({ where: { createdAt: { gte: startToday } } }),
    ]);

    const cashIncome = (cashOpen?.movements || []).filter((m) => m.type === "INGRESO").reduce((s, m) => s + m.amount, 0);
    const cashExpense = (cashOpen?.movements || []).filter((m) => m.type === "EGRESO").reduce((s, m) => s + m.amount, 0);

    const financialMetrics = {
      purchasesThisMonth: purchasesMonth._sum.total || 0,
      purchasesPaidThisMonth: purchasesMonth._sum.amountPaid || 0,
      purchasesCount: purchasesMonth._count,
      supplierDebt: supplierDebt._sum.balance || 0,
      receivables: receivablesTotal._sum.balance || 0,
      cashStatus: cashOpen ? "open" : "closed",
      cashInDrawer: cashOpen ? Math.round((cashOpen.openingAmount + cashIncome - cashExpense) * 100) / 100 : 0,
      cashOpenSince: cashOpen?.openedAt?.toISOString() || null,
      stockMovementsToday: stockMovesToday,
    };

    const recentOrdersActivity = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, customerName: true, status: true, createdAt: true, total: true },
    });
    for (const o of recentOrdersActivity) {
      recentActivity.push({
        id: `order-${o.id}`,
        type: "order",
        description: `Nuevo pedido de ${o.customerName} — Gs. ${o.total.toLocaleString("es-PY")}`,
        userName: o.customerName,
        createdAt: o.createdAt.toISOString(),
      });
    }

    const recentProducts = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, name: true, createdAt: true },
    });
    for (const p of recentProducts) {
      recentActivity.push({
        id: `product-${p.id}`,
        type: "product",
        description: `Se agregó el producto ${p.name}`,
        userName: "Sistema",
        createdAt: p.createdAt.toISOString(),
      });
    }

    recentActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    recentActivity.splice(10);

    const alerts: any[] = [];
    if (outOfStockProducts > 0) {
      alerts.push({ id: "out-of-stock", type: "danger", message: "Productos sin stock", count: outOfStockProducts, link: "/dashboard/admin/inventory" });
    }
    if (lowStockProducts > 0) {
      alerts.push({ id: "low-stock", type: "warning", message: "Productos con stock bajo", count: lowStockProducts, link: "/dashboard/admin/inventory" });
    }
    if (allTimeCounts.pending > 0) {
      alerts.push({ id: "pending-orders", type: "warning", message: "Pedidos pendientes de confirmar", count: allTimeCounts.pending, link: "/dashboard/admin/orders" });
    }
    if (allTimeCounts.cancelled > 0) {
      alerts.push({ id: "cancelled", type: "info", message: "Pedidos cancelados", count: allTimeCounts.cancelled, link: "/dashboard/admin/orders" });
    }

    const ordersByStatus: Record<string, number> = {
      pending: allTimeCounts.pending,
      confirmed: allTimeCounts.confirmed || 0,
      preparing: allTimeCounts.preparing || 0,
      shipped: allTimeCounts.shipped,
      delivered: allTimeCounts.delivered,
      cancelled: allTimeCounts.cancelled,
    };

    return NextResponse.json({
      salesToday,
      salesWeek,
      salesMonth,
      salesComparison: {
        today: salesToday,
        yesterday: salesYesterday,
        changeToday: salesYesterday > 0 ? ((salesToday - salesYesterday) / salesYesterday) * 100 : 0,
        week: salesWeek,
        lastWeek: salesLastWeek,
        changeWeek: salesLastWeek > 0 ? ((salesWeek - salesLastWeek) / salesLastWeek) * 100 : 0,
        month: salesMonth,
        lastMonth: salesLastMonth,
        changeMonth: salesLastMonth > 0 ? ((salesMonth - salesLastMonth) / salesLastMonth) * 100 : 0,
        total: totalSalesAllTime,
      },
      ordersToday: todayOrders.length,
      ordersWeek: weekOrders.length,
      ordersMonth: monthOrders.length,
      ordersByStatus,
      totalProducts,
      totalCustomers,
      customerMetrics: {
        total: totalCustomers,
        newThisMonth: newCustomersThisMonth,
        frequent: frequentCustomers,
        guestCheckouts,
        averagePurchase: averageTicket,
      },
      productMetrics: {
        total: totalProducts,
        active: activeProducts,
        outOfStock: outOfStockProducts,
        lowStock: lowStockProducts,
        topProducts: topProducts.map((p) => ({
          productId: p.id,
          name: p.name,
          sold: p.sold,
          revenue: p.sold * p.price,
        })),
      },
      inventoryMetrics: {
        totalValue: totalInventoryValue,
        totalUnits,
        highRotation: highRotation.map((p) => ({ id: p.id, name: p.name, sold: p.sold, stock: p.stock })),
        noMovement: noMovement.map((p) => ({ id: p.id, name: p.name, stock: p.stock, updatedAt: p.updatedAt.toISOString() })),
      },
      topProducts: topProducts.map((p) => ({ productId: p.id, name: p.name, sold: p.sold, revenue: p.sold * p.price })),
      lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, stock: p.stock, sku: p.sku })),
      recentOrders: allOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        customerName: o.customerName,
        createdAt: o.createdAt.toISOString(),
        customer: o.customerId ? { name: o.customerName } : null,
      })),
      salesByDay: salesByDay.reverse(),
      salesByWeek: salesByWeek.reverse(),
      salesByMonth: salesByMonth.reverse(),
      categorySales: Object.entries(catRevenue)
        .map(([name, data]) => ({ name, sold: data.sold, revenue: data.revenue }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 8),
      brandSales: Object.entries(brandRevenue)
        .map(([name, data]) => ({ name, sold: data.sold, revenue: data.revenue }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 8),
      customerGrowth: customerGrowth.reverse(),
      recentActivity,
      alerts,
      averageTicket,
      financialMetrics,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Error al obtener dashboard" }, { status: 500 });
  }
}
