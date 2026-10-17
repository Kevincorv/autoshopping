import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { AUTH_ROLES_CUSTOMERS } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_CUSTOMERS);
  if (auth.response) return auth.response;
  try {
    const tags = await prisma.customerTag.findMany({
      include: { _count: { select: { customers: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ tags: [] });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_CUSTOMERS);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const name = sanitizeText(String(body?.name || ""), 50).trim();
    const color = /^#[0-9a-fA-F]{3,8}$/.test(String(body?.color || "")) ? String(body.color) : "#3b82f6";
    if (!name) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }
    const tag = await prisma.customerTag.create({ data: { name, color } });
    await audit({
      action: "create",
      resource: "crm_tags",
      resourceId: tag.id,
      details: `Etiqueta "${name}" creada`,
      request,
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una etiqueta con ese nombre" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear etiqueta" }, { status: 500 });
  }
}
