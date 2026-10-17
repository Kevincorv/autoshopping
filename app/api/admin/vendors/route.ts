import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { AUTH_ROLES_ERP } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_ERP);
  if (auth.response) return auth.response;
  try {
    const vendors = await prisma.vendor.findMany({
      include: { _count: { select: { products: true, orderItems: true } } },
      orderBy: { name: "asc" },
    });

    const salesByVendor = await prisma.orderItem.groupBy({
      by: ["vendorId"],
      where: { vendorId: { not: null } },
      _sum: { subtotal: true },
      _count: { _all: true },
    });
    const salesMap = new Map(salesByVendor.map((s) => [s.vendorId, s]));

    const result = vendors.map((v) => {
      const sales = salesMap.get(v.id);
      const gross = sales?._sum.subtotal || 0;
      return {
        ...v,
        grossSales: gross,
        itemsSold: sales?._count._all || 0,
        commission: Math.round((gross * v.commissionPct) / 100),
      };
    });

    return NextResponse.json({ vendors: result });
  } catch {
    return NextResponse.json({ vendors: [] });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_ERP);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const name = sanitizeText(String(body?.name || ""), 120).trim();
    if (!name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });

    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `vendor-${Date.now()}`;
    const existing = await prisma.vendor.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const vendor = await prisma.vendor.create({
      data: {
        name,
        slug,
        contactName: body?.contactName ? sanitizeText(String(body.contactName), 100) : null,
        email: body?.email ? sanitizeText(String(body.email), 120).toLowerCase() : null,
        phone: body?.phone ? sanitizeText(String(body.phone), 30) : null,
        commissionPct: Math.min(100, Math.max(0, parseFloat(body?.commissionPct) || 10)),
      },
    });

    await audit({
      action: "create",
      resource: "vendors",
      resourceId: vendor.id,
      details: `Vendedor "${name}" creado (comisión ${vendor.commissionPct}%)`,
      request,
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear vendedor" }, { status: 500 });
  }
}
