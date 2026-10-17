import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/validation";
import { sendEmail, shell } from "@/lib/email";
import { sendPushToAll, isPushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function getAudienceCustomers(audience: string) {
  const where: Record<string, unknown> = { isBlocked: false };
  if (audience.startsWith("tag:")) {
    where.tags = { some: { id: audience.slice(4) } };
  }
  return prisma.customer.findMany({
    where,
    select: { id: true, name: true, email: true },
    take: 2000,
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
    if (!campaign) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    if (body?.action === "send") {
      if (campaign.status === "sent") {
        return NextResponse.json({ error: "La campaña ya fue enviada" }, { status: 400 });
      }

      const customers = await getAudienceCustomers(campaign.audience);
      let sent = 0;

      if (campaign.type === "email") {
        for (const c of customers) {
          const html = shell(
            campaign.subject || campaign.name,
            `<p>Hola ${c.name},</p><div style="white-space:pre-wrap;color:#d4d4d8;">${sanitizeText(campaign.body, 2000)}</div>`
          );
          const result = await sendEmail({
            to: c.email,
            subject: campaign.subject || campaign.name,
            html,
            template: "campaign",
          });
          if (result.sent || result.mode === "log") sent++;
        }
      } else if (campaign.type === "push") {
        if (!isPushConfigured()) {
          return NextResponse.json(
            { error: "Push no configurado. Agregá las VAPID keys a .env." },
            { status: 400 }
          );
        }
        const result = await sendPushToAll({
          title: campaign.subject || campaign.name,
          body: campaign.body.slice(0, 200),
        });
        sent = result.sent;
      } else {
        sent = customers.length;
      }

      const updated = await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "sent", sentAt: new Date(), sentCount: sent },
      });

      await audit({
        action: "update",
        resource: "campaigns",
        resourceId: campaign.id,
        details: `Campaña "${campaign.name}" enviada a ${sent} destinatarios (${campaign.type})`,
        request,
      });

      return NextResponse.json({ campaign: updated, sent });
    }

    const data: Record<string, unknown> = {};
    if (body?.name) data.name = sanitizeText(String(body.name), 120);
    if (body?.subject !== undefined) data.subject = body.subject ? sanitizeText(String(body.subject), 150) : null;
    if (body?.body !== undefined) data.body = sanitizeText(String(body.body), 2000);
    if (body?.audience) data.audience = sanitizeText(String(body.audience), 100);
    if (body?.type && ["email", "push", "whatsapp"].includes(String(body.type))) data.type = String(body.type);

    const updated = await prisma.campaign.update({ where: { id: campaign.id }, data });
    return NextResponse.json({ campaign: updated });
  } catch {
    return NextResponse.json({ error: "Error al actualizar campaña" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    await prisma.campaign.delete({ where: { id: params.id } });
    await audit({
      action: "delete",
      resource: "campaigns",
      resourceId: params.id,
      details: "Campaña eliminada",
      request,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar campaña" }, { status: 500 });
  }
}
