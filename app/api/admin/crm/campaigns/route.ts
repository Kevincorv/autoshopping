import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireAdmin } from "@/lib/auth/middleware";
import { AUTH_ROLES_CUSTOMERS } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_CUSTOMERS);
  if (auth.response) return auth.response;
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ campaigns });
  } catch {
    return NextResponse.json({ campaigns: [] });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_CUSTOMERS);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const name = sanitizeText(String(body?.name || ""), 120).trim();
    const type = ["email", "push", "whatsapp"].includes(String(body?.type)) ? String(body.type) : "email";
    const subject = body?.subject ? sanitizeText(String(body.subject), 150) : null;
    const text = sanitizeText(String(body?.body || ""), 2000);
    const audience = body?.audience ? sanitizeText(String(body.audience), 100) : "all";
    if (!name || !text) {
      return NextResponse.json({ error: "Nombre y mensaje son obligatorios" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: { name, type, subject, body: text, audience },
    });

    await audit({
      action: "create",
      resource: "campaigns",
      resourceId: campaign.id,
      details: `Campaña "${name}" creada (${type})`,
      request,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear campaña" }, { status: 500 });
  }
}
