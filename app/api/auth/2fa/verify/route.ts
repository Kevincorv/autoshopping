import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { verifyTotp, consumeRecoveryCode, countRecoveryCodes } from "@/lib/auth/totp";
import { createSession } from "@/lib/auth/session-store";
import { setSessionCookieOn, clearPending2faCookieOn } from "@/lib/auth/cookies";
import { signToken } from "@/lib/auth/jwt";
import { getClientIp } from "@/lib/auth/middleware";
import { rateLimit } from "@/lib/auth/rate-limit";
import { recordLoginAttempt, clearFailedLogins } from "@/lib/auth/login-attempts";
import { parseBody } from "@/lib/validation";
import { z } from "zod";
import { audit } from "@/lib/audit";

const schema = z.object({ code: z.string().trim().min(4).max(12) });

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limiter = rateLimit(`2fa-verify:${ip || "unknown"}`, 15, 60_000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Demasiados intentos. Esperá un minuto." }, { status: 429 });
    }

    const cookieStore = cookies();
    const pending = cookieStore.get(AUTH_CONFIG.pending2faCookieName)?.value;
    if (!pending) {
      return NextResponse.json({ error: "Sesión pendiente expirada. Ingresá de nuevo." }, { status: 401 });
    }

    const payload = await verifyToken(pending);
    if (!payload || payload.purpose !== "2fa") {
      return NextResponse.json({ error: "Sesión pendiente inválida" }, { status: 401 });
    }

    const parsed = await parseBody(request, schema);
    if (!parsed.ok) return parsed.response;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: { select: { name: true } } },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Cuenta no disponible" }, { status: 401 });
    }
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: "La verificación en dos pasos no está activada" }, { status: 400 });
    }

    const code = parsed.data.code;
    const isRecoveryFormat = /^[A-Z0-9]{4,6}-[A-Z0-9]{4,6}$/i.test(code);

    let ok = false;
    let usedRecovery = false;
    if (isRecoveryFormat) {
      const consumed = await consumeRecoveryCode(user.twoFactorRecovery, code.toUpperCase());
      ok = consumed.ok;
      if (consumed.ok && consumed.updated !== null) {
        usedRecovery = true;
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorRecovery: consumed.updated },
        });
      }
    } else {
      ok = await verifyTotp(user.twoFactorSecret, code);
    }

    if (!ok) {
      await recordLoginAttempt({
        email: user.email,
        ip,
        userId: user.id,
        success: false,
        reason: "2fa_invalid",
      });
      await audit({
        action: "auth.2fa.failed",
        resource: "auth",
        resourceId: user.id,
        details: `Código 2FA inválido para ${user.email}`,
        request,
        userId: user.id,
      });
      return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
    }

    const session = await createSession({ userId: user.id, ipAddress: ip, userAgent: request.headers.get("user-agent") });
    const token = await signToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      sid: session.id,
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
    });

    await clearFailedLogins(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await recordLoginAttempt({ email: user.email, ip, userId: user.id, success: true, reason: "2fa_ok" });
    await audit({
      action: "auth.login.success",
      resource: "auth",
      resourceId: user.id,
      details: `${user.email} inició sesión con 2FA${usedRecovery ? " (código de recuperación)" : ""}`,
      request,
      userId: user.id,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastname: user.lastname,
        role: { name: user.role.name },
        mustChangePassword: user.mustChangePassword,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      recoveryCodesRemaining: countRecoveryCodes(user.twoFactorRecovery),
      mustChangePassword: user.mustChangePassword,
    });
    setSessionCookieOn(response, token, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
    clearPending2faCookieOn(response);
    return response;
  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
