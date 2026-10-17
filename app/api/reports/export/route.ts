import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { AUTH_ROLES_ERP } from "@/lib/constants";

export const dynamic = "force-dynamic";

function csvEscape(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return [header.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
}

export async function GET(request: Request) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_ERP);
  if (auth.response) return auth.response;
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "orders";
    const days = Math.min(365, parseInt(url.searchParams.get("days") || "90") || 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let csv = "";
    const date = new Date().toISOString().slice(0, 10);

    if (type === "orders") {
      const orders = await prisma.order.findMany({
        where: { createdAt: { gte: since } },
        include: { items: { select: { productName: true, quantity: true, subtotal: true } } },
        orderBy: { createdAt: "desc" },
        take: 10000,
      });
      csv = toCsv(
        ["orderNumber", "createdAt", "customerName", "customerEmail", "status", "paymentStatus", "subtotal", "discount", "shipping", "total", "items"],
        orders.map((o) => [
          o.orderNumber,
          o.createdAt.toISOString(),
          o.customerName,
          o.customerEmail,
          o.status,
          o.paymentStatus,
          o.subtotal,
          o.discount,
          o.shipping,
          o.total,
          o.items.map((i) => `${i.productName} x${i.quantity}`).join("; "),
        ])
      );
    } else if (type === "products") {
      const products = await prisma.product.findMany({
        include: { category: { select: { name: true } } },
        orderBy: { sold: "desc" },
        take: 10000,
      });
      csv = toCsv(
        ["sku", "name", "brand", "category", "price", "costPrice", "stock", "sold", "rating", "reviews", "active"],
        products.map((p) => [
          p.sku, p.name, p.brandName || "", p.category?.name || "", p.price, p.costPrice, p.stock, p.sold, p.rating, p.reviews, p.isActive ? "yes" : "no",
        ])
      );
    } else if (type === "customers") {
      const customers = await prisma.customer.findMany({
        include: { _count: { select: { orders: true } } },
        orderBy: { totalPurchases: "desc" },
        take: 10000,
      });
      csv = toCsv(
        ["name", "lastname", "email", "phone", "city", "totalPurchases", "balance", "isBlocked", "orders", "createdAt"],
        customers.map((c) => [
          c.name, c.lastname, c.email, c.phone, c.city || "", c.totalPurchases, c.balance, c.isBlocked ? "yes" : "no", c._count.orders, c.createdAt.toISOString(),
        ])
      );
    } else if (type === "sales") {
      const sales = await prisma.order.findMany({
        where: { createdAt: { gte: since }, status: { not: "cancelled" } },
        orderBy: { createdAt: "desc" },
        take: 10000,
      });
      csv = toCsv(
        ["date", "orderNumber", "total", "paymentMethod", "paymentStatus"],
        sales.map((o) => [o.createdAt.toISOString().slice(0, 10), o.orderNumber, o.total, o.paymentMethod || "", o.paymentStatus])
      );
    } else {
      return NextResponse.json({ error: "type debe ser: orders, products, customers o sales" }, { status: 400 });
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="autoshopping-${type}-${date}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al exportar" }, { status: 500 });
  }
}
