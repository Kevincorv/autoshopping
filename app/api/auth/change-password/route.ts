import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { setSessionCookieOn } from "@/lib/auth/cookies";
import { revokeAllSessions } from "@/lib/auth/session-store";
import { PASSWORD_STAFF, PASSWORD_CUSTOMER, parseBody } from "@/lib/validation";
import { rateLimit } from "@/lib/auth/rate-limit";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { sendEmail, passwordChangedEmail } from "@/lib/email";

const schema = z.object({
  currentPassword: z.string().min(1, "Ingresá tu contraseña actual").max(200),
  newPassword: z.string().min(1, "Ingresá la nueva contraseña").max(200),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const payload = auth.payload;
  const limiter = rateLimit(`password-change:${payload.userId}`, 10, 60 * 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Demasiados intentos. Intentá más tarde." }, { status: 429 });
  }

  const parsed = await parseBody(request, schema);
  if (!parsed.ok) return parsed.response;

  const { currentPassword, newPassword } = parsed.data;

  const policy = payload.roleName === "customer" ? PASSWORD_CUSTOMER : PASSWORD_STAFF;
  const policyCheck = policy.safeParse(newPassword);
  if (!policyCheck.success) {
    return NextResponse.json(
      { error: policyCheck.error.issues[0]?.message || "Contraseña no cumple la política de seguridad" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return NextResponse.json({ error: "Usuario inexistente" }, { status: 404 });

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    await audit({
      action: "auth.password.change_failed",
      resource: "auth",
      resourceId: user.id,
      details: "Contraseña actual incorrecta",
      request,
      userId: user.id,
    });
    return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await revokeAllSessions(user.id, payload.sid);
  await audit({
    action: "auth.password.changed",
    resource: "auth",
    resourceId: user.id,
    details: `${user.email} cambió su contraseña`,
    request,
    userId: user.id,
  });

  sendEmail(passwordChangedEmail({ to: user.email, name: user.name })).catch(() => {});

  if (!payload.sid) {
    return NextResponse.json({ success: true });
  }

  const newToken = await signToken({
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: payload.roleName,
    sid: payload.sid,
    mustChangePassword: false,
    twoFactorEnabled: user.twoFactorEnabled,
  });

  const response = NextResponse.json({
    success: true,
    requires2FASetup: payload.roleName === "admin" && !user.twoFactorEnabled,
  });
  setSessionCookieOn(response, newToken);
  return response;
}
