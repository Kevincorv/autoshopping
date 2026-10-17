import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { z } from "zod";
import { getClientIp } from "@/lib/auth/middleware";
import { rateLimit, clearRateLimit } from "@/lib/auth/rate-limit";
import {
  getAccountLock,
  getIpLock,
  recordLoginAttempt,
  registerFailedLogin,
  clearFailedLogins,
} from "@/lib/auth/login-attempts";
import { createSession } from "@/lib/auth/session-store";
import { setSessionCookieOn, setPending2faCookieOn } from "@/lib/auth/cookies";
import { audit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(191),
  password: z.string().min(1).max(200),
});

let dummyHash: string | null = null;
async function timingEqualize(password: string): Promise<void> {
  if (!dummyHash) dummyHash = await bcrypt.hash("timing-equalizer", AUTH_CONFIG.bcryptRounds);
  await bcrypt.compare(password, dummyHash);
}

function lockResponse(message: string, retryAfterSec: number, code: string) {
  return NextResponse.json(
    { error: message, code, retryAfterSec },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || "";

    const ipKey = `login:ip:${ip || "unknown"}`;
    const ipLimiter = rateLimit(ipKey, 30, 60_000);
    if (!ipLimiter.ok) {
      return lockResponse(
        "Demasiados intentos desde esta conexión. Esperá un minuto.",
        ipLimiter.retryAfterSec,
        "RATE_LIMITED"
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const emailKey = `login:email:${email}`;
    const emailLimiter = rateLimit(emailKey, 10, 60_000);
    if (!emailLimiter.ok) {
      return lockResponse(
        "Demasiados intentos para esta cuenta. Esperá un minuto.",
        emailLimiter.retryAfterSec,
        "RATE_LIMITED"
      );
    }

    const ipLock = await getIpLock(ip);
    if (ipLock.locked) {
      return lockResponse(
        "Bloqueo temporal por intentos fallidos. Intentá de nuevo más tarde.",
        ipLock.retryAfterSec,
        "TOO_MANY_ATTEMPTS"
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: { select: { name: true } } },
    });

    if (!user) {
      await timingEqualize(password);
      await recordLoginAttempt({ email, ip, success: false, reason: "user_not_found" });
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const accountLock = await getAccountLock(user.id);
    if (accountLock.locked) {
      await recordLoginAttempt({ email, ip, userId: user.id, success: false, reason: "account_locked" });
      return lockResponse(
        `Cuenta bloqueada temporalmente por intentos fallidos. Intentá en ${Math.ceil(
          accountLock.retryAfterSec / 60
        )} minuto(s).`,
        accountLock.retryAfterSec,
        "ACCOUNT_LOCKED"
      );
    }

    if (!user.isActive) {
      await recordLoginAttempt({ email, ip, userId: user.id, success: false, reason: "inactive" });
      return NextResponse.json({ error: "Cuenta desactivada" }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const lock = await registerFailedLogin(user.id);
      await recordLoginAttempt({ email, ip, userId: user.id, success: false, reason: "bad_password" });
      await audit({
        action: "auth.login.failed",
        resource: "auth",
        resourceId: user.id,
        details: `Intento fallido para ${email}${lock.locked ? " (cuenta bloqueada)" : ""}`,
        request,
        userId: user.id,
      });
      if (lock.locked) {
        return lockResponse(
          `Demasiados intentos fallidos. Cuenta bloqueada por ${AUTH_CONFIG.lockoutMinutes} minutos.`,
          lock.retryAfterSec,
          "ACCOUNT_LOCKED"
        );
      }
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const roleName = user.role.name;

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const pendingToken = await signToken(
        {
          userId: user.id,
          email: user.email,
          roleId: user.roleId,
          roleName,
          purpose: "2fa",
        },
        { expiresIn: AUTH_CONFIG.pending2faExpiresIn }
      );
      await recordLoginAttempt({ email, ip, userId: user.id, success: true, reason: "password_ok_pending_2fa" });
      const response = NextResponse.json({
        requires2FA: true,
        recoveryAvailable: true,
        user: { email: user.email, name: user.name },
      });
      setPending2faCookieOn(response, pendingToken);
      await audit({
        action: "auth.login.password_ok",
        resource: "auth",
        resourceId: user.id,
        details: `Contraseña válida; pendiente 2FA para ${email}`,
        request,
        userId: user.id,
      });
      return response;
    }

    const session = await createSession({ userId: user.id, ipAddress: ip, userAgent });
    const token = await signToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName,
      sid: session.id,
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
    });

    await clearFailedLogins(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await recordLoginAttempt({ email, ip, userId: user.id, success: true });
    clearRateLimit(emailKey);
    await audit({
      action: "auth.login.success",
      resource: "auth",
      resourceId: user.id,
      details: `${email} (${roleName}) inició sesión`,
      request,
      userId: user.id,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastname: user.lastname,
        role: { name: roleName },
        mustChangePassword: user.mustChangePassword,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      mustChangePassword: user.mustChangePassword,
      requires2FASetup: roleName === "admin" && !user.twoFactorEnabled,
    });
    setSessionCookieOn(response, token, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
