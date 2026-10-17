import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "./config";

export interface LockState {
  locked: boolean;
  retryAfterSec: number;
  failedAttempts: number;
}

function secondsUntil(date: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

export async function getAccountLock(userId: string): Promise<LockState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true, failedLoginAttempts: true },
  });
  if (!user) return { locked: false, retryAfterSec: 0, failedAttempts: 0 };

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return {
      locked: true,
      retryAfterSec: secondsUntil(user.lockedUntil),
      failedAttempts: user.failedLoginAttempts,
    };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() <= Date.now()) {
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: null, failedLoginAttempts: 0 },
    });
    return { locked: false, retryAfterSec: 0, failedAttempts: 0 };
  }

  return { locked: false, retryAfterSec: 0, failedAttempts: user.failedLoginAttempts };
}

export async function getIpLock(ip: string | undefined): Promise<LockState> {
  if (!ip) return { locked: false, retryAfterSec: 0, failedAttempts: 0 };

  const since = new Date(Date.now() - AUTH_CONFIG.ipWindowMinutes * 60_000);
  const attempts = await prisma.loginAttempt.count({
    where: { ipAddress: ip, success: false, createdAt: { gte: since } },
  });

  if (attempts >= AUTH_CONFIG.ipMaxFailures) {
    const oldest = await prisma.loginAttempt.findFirst({
      where: { ipAddress: ip, success: false, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const retryAfterSec = oldest
      ? secondsUntil(new Date(oldest.createdAt.getTime() + AUTH_CONFIG.ipWindowMinutes * 60_000))
      : AUTH_CONFIG.ipWindowMinutes * 60;
    return { locked: true, retryAfterSec, failedAttempts: attempts };
  }

  return { locked: false, retryAfterSec: 0, failedAttempts: attempts };
}

export async function recordLoginAttempt(opts: {
  email: string;
  ip?: string;
  userId?: string;
  success: boolean;
  reason?: string;
}): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        email: opts.email.slice(0, 191),
        ipAddress: opts.ip ? opts.ip.slice(0, 191) : null,
        userId: opts.userId || null,
        success: opts.success,
        reason: opts.reason || null,
      },
    });
  } catch (e) {
    console.error("recordLoginAttempt error", e);
  }
}

export async function registerFailedLogin(userId: string): Promise<{ retryAfterSec: number; locked: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true },
  });
  if (!user) return { retryAfterSec: 0, locked: false };

  const failed = user.failedLoginAttempts + 1;
  const shouldLock = failed >= AUTH_CONFIG.maxFailedLogins;
  const lockedUntil = shouldLock ? new Date(Date.now() + AUTH_CONFIG.lockoutMinutes * 60_000) : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: shouldLock ? 0 : failed,
      lockedUntil,
    },
  });

  return {
    locked: shouldLock,
    retryAfterSec: shouldLock ? AUTH_CONFIG.lockoutMinutes * 60 : 0,
  };
}

export async function clearFailedLogins(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}
