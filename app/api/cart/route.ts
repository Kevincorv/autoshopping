import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { z } from "zod";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

const saveSchema = z.object({
  items: z.array(itemSchema).max(100),
});

async function getSessionId(request: Request): Promise<string | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_CONFIG.cookieName)?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) return `user:${payload.userId}`;
  }
  const sessionHeader = request.headers.get("x-session-id");
  return sessionHeader || null;
}

export async function GET(request: Request) {
  try {
    const sessionId = await getSessionId(request);
    if (!sessionId) return NextResponse.json({ items: [] });

    const items = await prisma.cartItem.findMany({
      where: { sessionId },
      include: {
        product: {
          select: { id: true, name: true, price: true, comparePrice: true, stock: true, slug: true },
          include: { images: { where: { isPrimary: true }, take: 1 } },
        },
      },
    });

    return NextResponse.json({
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        product: {
          name: i.product.name,
          price: i.product.price,
          comparePrice: i.product.comparePrice,
          stock: i.product.stock,
          slug: i.product.slug,
          image: i.product.images[0]?.url || null,
        },
      })),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

export async function POST(request: Request) {
  try {
    const sessionId = await getSessionId(request);
    if (!sessionId) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    await prisma.cartItem.deleteMany({ where: { sessionId } });

    if (parsed.data.items.length > 0) {
      await prisma.cartItem.createMany({
        data: parsed.data.items.map((item) => ({
          sessionId,
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al guardar carrito" }, { status: 500 });
  }
}
