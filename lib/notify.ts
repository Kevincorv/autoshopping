import { prisma } from "@/lib/prisma";

export async function notifyAdmins(opts: {
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { name: { in: ["admin", "sales", "stock_manager"] } }, isActive: true },
      select: { id: true },
    });
    if (admins.length === 0) return;
    await prisma.notification.createMany({
      data: admins.map((u: { id: string }) => ({
        userId: u.id,
        type: opts.type,
        title: opts.title,
        message: opts.message,
        link: opts.link || null,
      })),
    });
  } catch (e) {
    console.error("notify error", e);
  }
}

export async function checkLowStock(productId: string) {
  try {
    const p = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, sku: true, stock: true, minStock: true } });
    if (!p) return;
    if (p.stock === 0) {
      await notifyAdmins({ type: "stock_out", title: "Producto agotado", message: `${p.name} (${p.sku}) sin stock`, link: `/dashboard/admin/inventory` });
    } else if (p.stock <= p.minStock) {
      await notifyAdmins({ type: "low_stock", title: "Stock bajo", message: `${p.name} (${p.sku}) — Quedan ${p.stock} unidades de mínimo ${p.minStock}`, link: `/dashboard/admin/inventory` });
    }
  } catch (e) {
    console.error("checkLowStock error", e);
  }
}