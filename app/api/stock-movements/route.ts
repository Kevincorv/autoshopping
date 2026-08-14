import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["ENTRADA", "SALIDA"]),
  quantity: z.number().positive(),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase() || "";
    const type = url.searchParams.get("type") || "";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 300, 500);

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (q) where.product = { name: { contains: q } };
    if (from || to) {
      where.createdAt = {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(new Date(to).setHours(23, 59, 59)) : undefined,
      };
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: { product: { select: { id: true, name: true, unit: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const agg = await prisma.stockMovement.aggregate({
      where: { ...where, type: "ENTRADA" },
      _count: true, _sum: { quantity: true },
    });
    const out = await prisma.stockMovement.aggregate({
      where: { ...where, type: "SALIDA" },
      _count: true, _sum: { quantity: true },
    });
    return NextResponse.json({
      movements,
      stats: { total: movements.length, entries: agg._count, entriesQty: agg._sum.quantity || 0, exits: out._count, exitsQty: out._sum.quantity || 0 },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener movimientos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Tipo (ENTRADA/SALIDA), cantidad y motivo requeridos" }, { status: 400 });
    const d = parsed.data;
    const product = await prisma.product.findUnique({ where: { id: d.productId } });
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    if (d.type === "SALIDA" && d.quantity > product.stock) {
      return NextResponse.json({ error: `Stock insuficiente: disponible ${product.stock} ${product.unit}` }, { status: 409 });
    }

    const prev = product.stock;
    const next = d.type === "ENTRADA" ? prev + d.quantity : prev - d.quantity;

    const movement = await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: product.id }, data: { stock: Math.round(next * 100) / 100 } });
      return tx.stockMovement.create({
        data: {
          productId: product.id,
          type: d.type,
          quantity: d.quantity,
          reason: d.reason,
          unit: product.unit,
          stockBefore: prev,
          stockAfter: Math.round(next * 100) / 100,
          notes: d.notes || null,
        },
      });
    });

    await audit({ action: "stock", resource: "stockMovements", resourceId: movement.id, details: `${d.type} de ${d.quantity} ${product.unit} de ${product.name} (${d.reason})`, request });
    return NextResponse.json({ movement }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al registrar movimiento" }, { status: 500 });
  }
}