import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { can } from "@/lib/auth/permissions";
import { AUTH_ROLES_ERP } from "@/lib/constants";

export const dynamic = "force-dynamic";

const COST_FIELDS = ["costPrice", "unitCost", "lastPurchaseCost"] as const;

export async function GET(request: Request) {
  const auth = await requireRole(request as NextRequest, ...AUTH_ROLES_ERP);
  if (auth.response) return auth.response;

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

  const showCost = can(auth.payload.roleName, "products.cost");

  const products = await prisma.product.findMany({
    where,
    include: { brand: { select: { name: true } } },
    orderBy: q ? undefined : { name: "asc" },
    take: limit,
  });

  const sanitized = showCost
    ? products
    : products.map((p) => {
        const copy: Record<string, unknown> = { ...p };
        for (const field of COST_FIELDS) delete copy[field];
        return copy;
      });

  return NextResponse.json({ products: sanitized });
}
