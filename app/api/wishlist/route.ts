import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { z } from "zod";

const saveSchema = z.object({
  ids: z.array(z.string()).max(200),
});

async function getUserId(): Promise<string | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_CONFIG.cookieName)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ ids: [] });

    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      select: { productId: true },
    });

    return NextResponse.json({ ids: items.map((i) => i.productId) });
  } catch {
    return NextResponse.json({ ids: [] });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Debe iniciar sesión" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    await prisma.wishlistItem.deleteMany({ where: { userId } });

    if (parsed.data.ids.length > 0) {
      await prisma.wishlistItem.createMany({
        data: parsed.data.ids.map((productId) => ({ userId, productId })),
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al guardar favoritos" }, { status: 500 });
  }
}
