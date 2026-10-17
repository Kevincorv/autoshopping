import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireRole, requireAdmin } from "@/lib/auth/middleware";
import { AUTH_ROLES_ERP } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { normalizeCouponCode } from "@/lib/coupons";
import { sanitizeText } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_ERP);
  if (auth.response) return auth.response;
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return NextResponse.json({ coupons });
  } catch {
    return NextResponse.json({ coupons: [] });
  }
}

const createSchema = z.object({
  code: z.string().min(3).max(40),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  description: z.string().max(200).optional(),
  minPurchase: z.number().nonnegative().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  startsAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de cupón inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const d = parsed.data;
    if (d.type === "percent" && d.value > 100) {
      return NextResponse.json({ error: "Un cupón porcentual no puede superar el 100%" }, { status: 400 });
    }

    const code = normalizeCouponCode(d.code);
    if (code.length < 3) {
      return NextResponse.json({ error: "El código debe tener al menos 3 caracteres" }, { status: 400 });
    }

    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un cupón con ese código" }, { status: 409 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        type: d.type,
        value: d.value,
        description: d.description ? sanitizeText(d.description, 200) : null,
        minPurchase: d.minPurchase ?? null,
        maxUses: d.maxUses ?? null,
        startsAt: d.startsAt ? new Date(d.startsAt) : null,
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
        isActive: d.isActive !== false,
      },
    });

    await audit({
      action: "create",
      resource: "coupons",
      resourceId: coupon.id,
      details: `Cupón ${coupon.code} creado (${coupon.type} ${coupon.value})`,
      request,
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un cupón con ese código" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear cupón" }, { status: 500 });
  }
}
