import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { z } from "zod";
import { sanitizeText } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(request as any);
  if (auth.response) return auth.response;
  try {
    const isErp = ["admin", "sales", "stock_manager", "accountant"].includes(auth.payload.roleName);
    const orders = await prisma.order.findMany({
      where: isErp
        ? {}
        : { OR: [{ userId: auth.payload.userId }, { customerEmail: auth.payload.email }] },
      include: {
        items: { select: { id: true, productName: true, quantity: true, unitPrice: true, subtotal: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}

const createSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
    name: z.string().optional(),
    price: z.number().optional(),
  })).min(1).max(100),
  customer: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().max(100),
    phone: z.string().min(1).max(30),
    address: z.string().min(1).max(200),
    city: z.string().max(100).optional(),
  }),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().max(120).optional(),
  couponCode: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
  pointsToRedeem: z.number().int().min(0).max(1_000_000).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth(request as any);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }
    const { items, customer, paymentMethod, paymentReference, couponCode, notes, pointsToRedeem } = parsed.data;

    const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) return NextResponse.json({ error: `Producto no encontrado: ${item.productId}` }, { status: 404 });
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Stock insuficiente para ${product.name}` }, { status: 409 });
      }
    }

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = item.price || product.price;
      return {
        productId: item.productId,
        productName: item.name || product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPrice,
        unitCost: product.unitCost ?? product.lastPurchaseCost ?? product.costPrice ?? null,
        subtotal: unitPrice * item.quantity,
        vendorId: product.vendorId || null,
      };
    });

    const subtotal = Math.round(orderItems.reduce((s, i) => s + i.subtotal, 0));
    let discount = 0;
    let couponId: string | null = null;
    if (couponCode) {
      const { validateCoupon, consumeCoupon } = await import("@/lib/coupons");
      const check = await validateCoupon(couponCode, subtotal);
      if (!check.ok || !check.coupon) {
        return NextResponse.json({ error: check.error || "Cupón inválido" }, { status: 400 });
      }
      discount = check.discount!;
      couponId = check.coupon.id;
      const consumed = await consumeCoupon(couponId);
      if (!consumed) return NextResponse.json({ error: "Cupón no disponible" }, { status: 409 });
    }

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const total = Math.max(0, subtotal - discount);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: auth.payload.userId,
        status: "pending",
        subtotal,
        discount,
        total,
        paymentMethod: paymentMethod || null,
        paymentReference: paymentReference ? sanitizeText(paymentReference, 120) : null,
        couponId,
        notes: notes ? sanitizeText(notes, 500) : null,
        customerName: sanitizeText(customer.name, 100),
        customerPhone: sanitizeText(customer.phone, 30),
        customerEmail: sanitizeText(customer.email, 100).toLowerCase(),
        customerAddress: sanitizeText(customer.address, 200),
        customerCity: sanitizeText(customer.city || "", 100),
        items: { create: orderItems },
        statusHistory: { create: { status: "pending", notes: "Pedido vía API móvil" } },
      },
      include: { items: true },
    });

    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity }, sold: { increment: item.quantity } },
      });
    }

    return NextResponse.json({ order, orderNumber }, { status: 201 });
  } catch (error) {
    console.error("API v1 create order error:", error);
    return NextResponse.json({ error: "Error al crear pedido" }, { status: 500 });
  }
}
