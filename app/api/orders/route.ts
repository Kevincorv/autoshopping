import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth, getClientIp } from "@/lib/auth/middleware";
import { isErpRole } from "@/lib/auth/permissions";
import { sanitizeText } from "@/lib/validation";
import { validateCoupon, consumeCoupon } from "@/lib/coupons";
import { rateLimit } from "@/lib/auth/rate-limit";
import { verifySessionToken } from "@/lib/auth/jwt";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { cookies } from "next/headers";
import { notifyAdmins, checkLowStock } from "@/lib/notify";
import { sendEmail, orderCreatedEmail } from "@/lib/email";
import {
  getLoyaltyRule,
  getLoyaltyBalance,
  calcEarnedPoints,
  calcRedeemDiscountGs,
  calcMaxRedeemPoints,
  findOrCreateCustomerForOrder,
} from "@/lib/loyalty";

const createOrderSchema = z.object({
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

export async function GET(request: Request) {
  const auth = await requireAuth(request as any);
  if (auth.response) return auth.response;
  try {
    const isErp = isErpRole(auth.payload.roleName);
    const orders = await prisma.order.findMany({
      where: isErp
        ? {}
        : {
            OR: [
              { userId: auth.payload.userId },
              { customerEmail: auth.payload.email },
            ],
          },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limiter = rateLimit(`order-create:${ip || "unknown"}`, 10, 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Demasiados pedidos desde esta conexión. Esperá un minuto." }, { status: 429 });
  }

  // Idempotencia: evita pedidos duplicados por reintento/timeout
  const idempotencyKey = request.headers.get("Idempotency-Key") || undefined;
  if (idempotencyKey) {
    const cleanedKey = idempotencyKey.trim().slice(0, 100);
    const existing = await prisma.order.findFirst({
      where: { idempotencyKey: cleanedKey },
      include: { items: true },
    });
    if (existing) {
      return NextResponse.json({
        ok: true,
        order: existing,
        orderNumber: existing.orderNumber,
        totals: {
          subtotal: existing.subtotal,
          discount: existing.discount,
          shipping: existing.shipping,
          total: existing.total,
        },
      });
    }
  }

  let sessionUserId: string | null = null;
  try {
    const token = cookies().get(AUTH_CONFIG.cookieName)?.value;
    const payload = token ? await verifySessionToken(token) : null;
    if (payload?.userId) sessionUserId = payload.userId;
  } catch {}

  try {
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { items, customer, paymentMethod, paymentReference, couponCode, notes, pointsToRedeem } = parsed.data;

    const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: `Producto no encontrado: ${item.productId}` }, { status: 404 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json({
          error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`,
        }, { status: 409 });
      }
    }

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = product.price;
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
      const check = await validateCoupon(couponCode, subtotal);
      if (!check.ok || !check.coupon) {
        return NextResponse.json({ error: check.error || "Cupón inválido" }, { status: 400 });
      }
      discount = check.discount!;
      couponId = check.coupon.id;
    }

    const subtotalAfterCoupon = Math.max(0, subtotal - discount);

    let loyaltyCustomerId: string | null = null;
    let pointsRedeemed = 0;
    let pointsDiscountGs = 0;
    let rule = null;
    if (pointsToRedeem && pointsToRedeem > 0) {
      rule = await getLoyaltyRule();
      if (!rule.active) {
        return NextResponse.json({ error: "El programa de puntos está desactivado" }, { status: 400 });
      }
      const cust = await findOrCreateCustomerForOrder({
        userId: sessionUserId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      });
      loyaltyCustomerId = cust.id;
      const balance = await getLoyaltyBalance(cust.id);
      const maxRedeem = calcMaxRedeemPoints(subtotalAfterCoupon, rule, balance);
      if (pointsToRedeem > balance) {
        return NextResponse.json({ error: `Solo tenés ${balance} puntos disponibles` }, { status: 400 });
      }
      if (pointsToRedeem < rule.minRedeemPoints) {
        return NextResponse.json({ error: `El mínimo para canjear es de ${rule.minRedeemPoints} puntos` }, { status: 400 });
      }
      if (pointsToRedeem > maxRedeem) {
        return NextResponse.json({ error: `Podés canjear hasta ${maxRedeem} puntos en este pedido` }, { status: 400 });
      }
      pointsRedeemed = pointsToRedeem;
      pointsDiscountGs = Math.min(calcRedeemDiscountGs(pointsToRedeem, rule), subtotalAfterCoupon);
    }

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const total = Math.max(0, subtotalAfterCoupon - pointsDiscountGs);
    const pointsEarned = rule && rule.active ? calcEarnedPoints(total, rule) : 0;

    if (pointsEarned > 0 && !loyaltyCustomerId) {
      const cust = await findOrCreateCustomerForOrder({
        userId: sessionUserId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      });
      loyaltyCustomerId = cust.id;
    }

    const order = await prisma.$transaction(async (tx) => {
      if (couponId) {
        const consumed = await consumeCoupon(couponId);
        if (!consumed) {
          throw new Error("COUPON_UNAVAILABLE");
        }
      }
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: sessionUserId,
          customerId: loyaltyCustomerId,
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
          loyaltyPointsEarned: pointsEarned,
          loyaltyPointsRedeemed: pointsRedeemed,
          pointsDiscount: pointsDiscountGs,
          items: { create: orderItems },
          statusHistory: {
            create: { status: "pending", notes: "Pedido creado" },
          },
        },
        include: { items: true },
      });

      if (loyaltyCustomerId) {
        if (pointsRedeemed > 0) {
          await tx.loyaltyPoint.create({
            data: {
              customerId: loyaltyCustomerId,
              orderId: created.id,
              type: "redeem",
              points: -pointsRedeemed,
              note: `Canje en ${orderNumber} (Gs. ${Math.round(pointsDiscountGs).toLocaleString("es-PY")})`,
            },
          });
        }
        if (pointsEarned > 0) {
          await tx.loyaltyPoint.create({
            data: {
              customerId: loyaltyCustomerId,
              orderId: created.id,
              type: "earn",
              points: pointsEarned,
              note: `Ganados en ${orderNumber}`,
            },
          });
        }
      }

      return created;
    });

    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity }, sold: { increment: item.quantity } },
      });
      checkLowStock(item.productId).catch(() => {});
    }

    notifyAdmins({
      type: "order",
      title: "Nuevo pedido",
      message: `${orderNumber} de ${customer.name} — Gs. ${total.toLocaleString("es-PY")}`,
      link: "/dashboard/admin/orders",
    }).catch(() => {});

    sendEmail(
      orderCreatedEmail({
        to: order.customerEmail,
        customerName: order.customerName,
        orderNumber,
        total,
        paymentMethod: order.paymentMethod,
        trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/track/${orderNumber}`,
      })
    ).catch(() => {});

    try {
      if (typeof globalThis.__emit === "function") {
        globalThis.__emit("order:new", { orderNumber, customer: customer.name, total });
      }
    } catch {}

    return NextResponse.json({ order, orderNumber }, { status: 201 });
  } catch (error: any) {
    if (error?.message === "COUPON_UNAVAILABLE") {
      return NextResponse.json({ error: "El cupón ya no está disponible. Probá con otro." }, { status: 409 });
    }
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Error al crear pedido" }, { status: 500 });
  }
}
