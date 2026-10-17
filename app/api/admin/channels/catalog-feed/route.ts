import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

function csvEscape(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        category: { select: { name: true } },
      },
      take: 5000,
    });

    const header = [
      "id", "title", "description", "availability", "condition", "price",
      "link", "image_link", "brand", "product_type", "sku",
    ].join(",");

    const lines = products.map((p) => {
      const image = p.images[0]?.url || "";
      const link = `${appUrl}/products/${p.slug}`;
      return [
        csvEscape(p.id),
        csvEscape(p.name),
        csvEscape(p.shortDescription || p.description.slice(0, 500)),
        csvEscape(p.stock > 0 ? "in stock" : "out of stock"),
        csvEscape("new"),
        csvEscape(`${Math.round(p.price)} PYG`),
        csvEscape(link),
        csvEscape(image),
        csvEscape(p.brandName || ""),
        csvEscape(p.category?.name || ""),
        csvEscape(p.sku),
      ].join(",");
    });

    const csv = [header, ...lines].join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="autoshopping-catalog-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al generar feed" }, { status: 500 });
  }
}
