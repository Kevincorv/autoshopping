import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const img = await prisma.productImage.findFirst({
      where: { id: params.imageId, productId: product.id },
    });
    if (!img) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });

    const d = await req.json();

    if (d.isPrimary === true) {
      await prisma.productImage.updateMany({ where: { productId: product.id }, data: { isPrimary: false } });
    }

    const data: Record<string, unknown> = {};
    if (d.url !== undefined) data.url = String(d.url);
    if (d.alt !== undefined) data.alt = d.alt ? String(d.alt) : null;
    if (d.isPrimary !== undefined) data.isPrimary = !!d.isPrimary;

    const updated = await prisma.productImage.update({ where: { id: img.id }, data });
    return NextResponse.json({ image: updated });
  } catch (error) {
    console.error("Image update error:", error);
    return NextResponse.json({ error: "Error al actualizar la imagen" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const img = await prisma.productImage.findFirst({
      where: { id: params.imageId, productId: product.id },
    });
    if (!img) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });

    await prisma.productImage.delete({ where: { id: img.id } });

    // Si era la principal, promover la primera restante
    if (img.isPrimary) {
      const next = await prisma.productImage.findFirst({
        where: { productId: product.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      if (next) {
        await prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Image delete error:", error);
    return NextResponse.json({ error: "Error al eliminar la imagen" }, { status: 500 });
  }
}
