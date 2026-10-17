import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";
import { audit } from "@/lib/audit";
import { getLoyaltyRule } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const rule = await getLoyaltyRule();
    return NextResponse.json({ rule });
  } catch {
    return NextResponse.json({ error: "Error al cargar regla" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const rule = await getLoyaltyRule();
    const data: Record<string, number | boolean> = {};

    const intFields = ["pointsPer1000Gs", "valuePerPointGs", "minRedeemPoints", "maxRedeemPercent"] as const;
    for (const f of intFields) {
      if (body?.[f] !== undefined) {
        const v = Math.max(0, Math.floor(Number(body[f])));
        if (!isNaN(v)) data[f] = v;
      }
    }
    if (body?.active !== undefined) data.active = Boolean(body.active);

    const updated = await prisma.loyaltyRule.update({ where: { id: rule.id }, data });

    await audit({
      action: "update",
      resource: "loyalty_rule",
      resourceId: updated.id,
      details: `Regla de puntos: ${updated.pointsPer1000Gs} ptos/1000 Gs, ${updated.valuePerPointGs} Gs/ppto, mín ${updated.minRedeemPoints}, canje máx ${updated.maxRedeemPercent}%`,
      request,
    });

    return NextResponse.json({ rule: updated });
  } catch {
    return NextResponse.json({ error: "Error al actualizar regla" }, { status: 500 });
  }
}
