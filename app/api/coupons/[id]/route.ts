import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/middleware";
import { audit } from "@/lib/audit";
import { normalizeCouponCode } from "@/lib/coupons";
import { sanitizeText } from "@/lib/validation";

const patchSchema = z.object({
  code: z.string().min(3).max(40).optional(),
  type: z.enum(["percent", "fixed"]).optional(),
  value: z.number().positive().optional(),
  description: z.string().max(200).optional().nullable(),
  minPurchase: z.number().nonnegative().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  startsAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }
    const d = parsed.data;
    if (d.type === "percent" && d.value != null && d.value > 100) {
      return NextResponse.json({ error: "Un cupón porcentual no puede superar el 100%" }, { status: 400 });
    }

    const existing = await prisma.coupon.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 });

    const coupon = await prisma.coupon.update({
      where: { id: params.id },
      data: {
        ...(d.code !== undefined ? { code: normalizeCouponCode(d.code) } : {}),
        ...(d.type !== undefined ? { type: d.type } : {}),
        ...(d.value !== undefined ? { value: d.value } : {}),
        ...(d.description !== undefined ? { description: d.description ? sanitizeText(d.description, 200) : null } : {}),
        ...(d.minPurchase !== undefined ? { minPurchase: d.minPurchase } : {}),
        ...(d.maxUses !== undefined ? { maxUses: d.maxUses } : {}),
        ...(d.startsAt !== undefined ? { startsAt: d.startsAt ? new Date(d.startsAt) : null } : {}),
        ...(d.expiresAt !== undefined ? { expiresAt: d.expiresAt ? new Date(d.expiresAt) : null } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      },
    });

    await audit({
      action: "update",
      resource: "coupons",
      resourceId: coupon.id,
      details: `Cupón ${coupon.code} actualizado`,
      request,
    });

    return NextResponse.json({ coupon });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un cupón con ese código" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al actualizar cupón" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const existing = await prisma.coupon.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 });
    const used = await prisma.order.count({ where: { couponId: params.id } });
    if (used > 0) {
      await prisma.coupon.update({ where: { id: params.id }, data: { isActive: false } });
      await audit({
        action: "deactivate",
        resource: "coupons",
        resourceId: params.id,
        details: `Cupón ${existing.code} desactivado (tenía ${used} orden(es) asociadas)`,
        request,
      });
      return NextResponse.json({
        ok: true,
        deactivated: true,
        message: "El cupón tiene órdenes asociadas: se desactivó en lugar de eliminarlo.",
      });
    }
    await prisma.coupon.delete({ where: { id: params.id } });
    await audit({
      action: "delete",
      resource: "coupons",
      resourceId: params.id,
      details: `Cupón ${existing.code} eliminado`,
      request,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar cupón" }, { status: 500 });
  }
}
