import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/middleware";
import { AUTH_ROLES_ERP } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireRole(request as any, ...AUTH_ROLES_ERP);
  if (auth.response) return auth.response;
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const where: Record<string, unknown> = {};
    if (status === "open" || status === "closed") where.status = status;

    const sessions = await prisma.chatSession.findMany({
      where,
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
      take: 200,
    });
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}
