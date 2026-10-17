import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "./config";

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
}

export type SessionValidation =
  | { ok: true; session: SessionRecord }
  | { ok: false; reason: "missing" | "revoked" | "expired" | "idle" };

const TOUCH_INTERVAL_MS = 60_000;

export async function createSession(opts: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ id: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.sessionDays * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: {
      userId: opts.userId,
      ipAddress: (opts.ipAddress || "").slice(0, 191) || null,
      userAgent: (opts.userAgent || "").slice(0, 191) || null,
      expiresAt,
    },
    select: { id: true, expiresAt: true },
  });
  return session;
}

export async function validateSession(sessionId: string | undefined): Promise<SessionValidation> {
  if (!sessionId) return { ok: false, reason: "missing" };

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { ok: false, reason: "missing" };
  if (session.revokedAt) return { ok: false, reason: "revoked" };

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) return { ok: false, reason: "expired" };

  const idleMs = AUTH_CONFIG.sessionIdleMinutes * 60_000;
  if (now - session.lastSeenAt.getTime() > idleMs) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return { ok: false, reason: "idle" };
  }

  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }

  return { ok: true, session };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session
    .updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } })
    .catch(() => undefined);
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await prisma.session
    .updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);
}

export async function listActiveSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, ipAddress: true, userAgent: true, createdAt: true, lastSeenAt: true },
  });
}

export async function pruneExpiredSessions(): Promise<number> {
  const res = await prisma.session.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { lastSeenAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }] },
  });
  return res.count;
}
