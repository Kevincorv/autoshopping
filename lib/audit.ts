import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function audit(opts: {
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  request?: Request;
  userId?: string | null;
}) {
  try {
    let userId: string | null = opts.userId ?? null;
    if (userId === null || userId === undefined) {
      const user = await getSessionUser();
      userId = user?.userId || null;
    }
    const ip =
      opts.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      opts.request?.headers.get("x-real-ip") ||
      undefined;
    await prisma.auditLog.create({
      data: {
        userId,
        action: opts.action,
        resource: opts.resource,
        resourceId: opts.resourceId || null,
        details: opts.details || null,
        ipAddress: ip || null,
      },
    });
  } catch (e) {
    console.error("audit error", e);
  }
}
