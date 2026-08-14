import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
  notes: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
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
  try {
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { items, customer, paymentMethod, notes } = parsed.data;

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return NextResponse.json({ error: `Producto no encontrado: ${item.productId}` }, { status: 404 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json({
          error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`,
        }, { status: 409 });
      }
    }

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const orderItems = await Promise.all(items.map(async (item) => {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      const unitPrice = item.price || product!.price;
      return {
        productId: item.productId,
        productName: item.name || product!.name,
        productSku: product!.sku,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
      };
    }));

    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: "pending",
        subtotal,
        total: subtotal,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        customerAddress: customer.address,
        customerCity: customer.city || "",
        items: { create: orderItems },
        statusHistory: {
          create: { status: "pending", notes: "Pedido creado" },
        },
      },
      include: { items: true },
    });

    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity }, sold: { increment: item.quantity } },
      });
    }

    try {
      if (typeof globalThis.__emit === "function") {
        globalThis.__emit("order:new", { orderNumber, customer: customer.name, total: subtotal });
      }
    } catch {}

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Error al crear pedido" }, { status: 500 });
  }
}
