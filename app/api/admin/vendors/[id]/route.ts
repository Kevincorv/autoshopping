import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { AUTH_ROLES_ERP } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_ERP);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body?.name) data.name = sanitizeText(String(body.name), 120);
    if (body?.contactName !== undefined) data.contactName = body.contactName ? sanitizeText(String(body.contactName), 100) : null;
    if (body?.email !== undefined) data.email = body.email ? sanitizeText(String(body.email), 120).toLowerCase() : null;
    if (body?.phone !== undefined) data.phone = body.phone ? sanitizeText(String(body.phone), 30) : null;
    if (body?.commissionPct !== undefined) data.commissionPct = Math.min(100, Math.max(0, parseFloat(body.commissionPct) || 0));
    if (body?.status && ["active", "inactive"].includes(String(body.status))) data.status = String(body.status);

    const vendor = await prisma.vendor.update({ where: { id: params.id }, data });
    await audit({
      action: "update",
      resource: "vendors",
      resourceId: vendor.id,
      details: `Vendedor "${vendor.name}" actualizado`,
      request,
    });
    return NextResponse.json({ vendor });
  } catch {
    return NextResponse.json({ error: "Error al actualizar vendedor" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_ERP);
  if (auth.response) return auth.response;
  try {
    const withSales = await prisma.orderItem.count({ where: { vendorId: params.id } });
    if (withSales > 0) {
      await prisma.product.updateMany({ where: { vendorId: params.id }, data: { vendorId: null } });
      await prisma.vendor.delete({ where: { id: params.id } });
    } else {
      await prisma.product.updateMany({ where: { vendorId: params.id }, data: { vendorId: null } });
      await prisma.vendor.delete({ where: { id: params.id } });
    }
    await audit({
      action: "delete",
      resource: "vendors",
      resourceId: params.id,
      details: "Vendedor eliminado (productos desvinculados)",
      request,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar vendedor" }, { status: 500 });
  }
}
