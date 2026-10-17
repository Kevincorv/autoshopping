import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { AUTH_ROLES_CUSTOMERS } from "@/lib/constants";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_CUSTOMERS);
  if (auth.response) return auth.response;
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: { tags: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json({ error: "Error al cargar cliente" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_CUSTOMERS);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const tagIds: string[] = Array.isArray(body?.tagIds) ? body.tagIds.filter((x: any) => typeof x === "string").slice(0, 30) : [];

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: { tags: { set: tagIds.map((id) => ({ id })) } },
      include: { tags: true },
    });

    await audit({
      action: "update",
      resource: "crm_customers",
      resourceId: customer.id,
      details: `Etiquetas de cliente actualizadas (${customer.tags.map((t) => t.name).join(", ") || "ninguna"})`,
      request,
    });

    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json({ error: "Error al actualizar etiquetas" }, { status: 500 });
  }
}
