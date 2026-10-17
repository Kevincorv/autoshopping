import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/middleware";
import { sanitizeText } from "@/lib/validation";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const page = Math.max(1, parseInt(new URL(request.url).searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(new URL(request.url).searchParams.get("limit") || "10"));

    const [reviews, total, agg] = await Promise.all([
      prisma.review.findMany({
        where: { productId: params.id },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where: { productId: params.id } }),
      prisma.review.aggregate({ where: { productId: params.id }, _avg: { rating: true } }),
    ]);

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        verifiedPurchase: r.verifiedPurchase,
        author: r.user.name,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    });
  } catch {
    return NextResponse.json({ reviews: [], total: 0, average: null });
  }
}

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  comment: z.string().min(3).max(2000),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request as any);
  if (auth.response) return auth.response;
  try {
    const product = await prisma.product.findUnique({ where: { id: params.id } });
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de reseña inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.review.findUnique({
      where: { productId_userId: { productId: params.id, userId: auth.payload.userId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Ya dejaste una reseña para este producto" }, { status: 409 });
    }

    const verifiedOrder = await prisma.order.findFirst({
      where: {
        OR: [{ userId: auth.payload.userId }, { customerEmail: auth.payload.email }],
        status: { in: ["delivered", "completed"] },
        items: { some: { productId: params.id } },
      },
    });

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          productId: params.id,
          userId: auth.payload.userId,
          rating: parsed.data.rating,
          title: parsed.data.title ? sanitizeText(parsed.data.title, 120) : null,
          comment: sanitizeText(parsed.data.comment, 2000),
          verifiedPurchase: !!verifiedOrder,
        },
      });

      const agg = await tx.review.aggregate({
        where: { productId: params.id },
        _avg: { rating: true },
        _count: true,
      });
      await tx.product.update({
        where: { id: params.id },
        data: {
          rating: Math.round((agg._avg.rating || 0) * 10) / 10,
          reviews: agg._count,
        },
      });

      return created;
    });

    await audit({
      action: "create",
      resource: "reviews",
      resourceId: review.id,
      details: `Reseña ${parsed.data.rating}★ para ${product.name}`,
      request,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya dejaste una reseña para este producto" }, { status: 409 });
    }
    console.error("Review create error:", error);
    return NextResponse.json({ error: "Error al crear la reseña" }, { status: 500 });
  }
}
