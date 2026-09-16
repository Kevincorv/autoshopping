import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function audit(opts: {
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  request?: Request;
}) {
  try {
    const user = await getSessionUser();
    const ip = opts.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    await prisma.auditLog.create({
      data: {
        userId: user?.userId || null,
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