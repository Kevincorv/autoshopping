import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").toLowerCase();
  const barcode = url.searchParams.get("barcode");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);

  const where: Record<string, unknown> = {};
  if (barcode) {
    where.OR = [{ barcode }, { secondaryBarcode: barcode }];
  } else if (q) {
    where.OR = [
      { name: { contains: q } },
      { unit: { contains: q } },
      { brand: { name: { contains: q } } },
    ];
  }
  const products = await prisma.product.findMany({
    where,
    include: { brand: { select: { name: true } } },
    orderBy: q ? undefined : { name: "asc" },
    take: limit,
  });
  return NextResponse.json({ products });
}