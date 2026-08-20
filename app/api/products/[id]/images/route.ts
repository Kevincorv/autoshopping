import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const product = await prisma.product.findFirst({
    where: { OR: [{ id: params.id }, { slug: params.id }] },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const images = await prisma.productImage.findMany({
    where: { productId: product.id },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({
    images: images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, isPrimary: i.isPrimary, sortOrder: i.sortOrder })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const d = await req.json();
    const url = String(d.url || "").trim();
    if (!url || !/^https?:\/\//i.test(url))
      return NextResponse.json({ error: "URL de imagen no válida" }, { status: 400 });

    const count = await prisma.productImage.count({ where: { productId: product.id } });
    const makePrimary = !!d.isPrimary || count === 0;

    if (makePrimary) {
      await prisma.productImage.updateMany({ where: { productId: product.id }, data: { isPrimary: false } });
    }

    const img = await prisma.productImage.create({
      data: {
        productId: product.id,
        url,
        alt: d.alt ? String(d.alt) : null,
        isPrimary: makePrimary,
        sortOrder: count,
      },
    });
    return NextResponse.json({ image: img }, { status: 201 });
  } catch (error) {
    console.error("Image create error:", error);
    return NextResponse.json({ error: "Error al agregar la imagen" }, { status: 500 });
  }
}
