import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { AUTH_ROLES_CUSTOMERS } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_CUSTOMERS);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const data: Record<string, string> = {};
    if (body?.name) data.name = sanitizeText(String(body.name), 50).trim();
    if (body?.color && /^#[0-9a-fA-F]{3,8}$/.test(String(body.color))) data.color = String(body.color);
    const tag = await prisma.customerTag.update({ where: { id: params.id }, data });
    await audit({
      action: "update",
      resource: "crm_tags",
      resourceId: tag.id,
      details: `Etiqueta "${tag.name}" actualizada`,
      request,
    });
    return NextResponse.json({ tag });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una etiqueta con ese nombre" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al actualizar etiqueta" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_CUSTOMERS);
  if (auth.response) return auth.response;
  try {
    await prisma.customerTag.delete({ where: { id: params.id } });
    await audit({
      action: "delete",
      resource: "crm_tags",
      resourceId: params.id,
      details: "Etiqueta eliminada",
      request,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar etiqueta" }, { status: 500 });
  }
}
