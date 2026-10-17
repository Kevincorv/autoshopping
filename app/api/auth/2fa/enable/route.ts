import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";
import { verifyTotp, generateRecoveryCodes, hashRecoveryCodes } from "@/lib/auth/totp";
import { setSessionCookieOn } from "@/lib/auth/cookies";
import { signToken } from "@/lib/auth/jwt";
import { parseBody, zodIssues } from "@/lib/validation";
import { rateLimit } from "@/lib/auth/rate-limit";
import { z } from "zod";
import { audit } from "@/lib/audit";

const schema = z.object({ code: z.string().trim().min(6).max(10) });

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const limiter = rateLimit(`2fa-enable:${auth.payload.userId}`, 10, 60 * 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Demasiados intentos. Intentá más tarde." }, { status: 429 });
  }

  const parsed = await parseBody(request, schema);
  if (!parsed.ok) return parsed.response;

  const user = await prisma.user.findUnique({ where: { id: auth.payload.userId } });
  if (!user) return NextResponse.json({ error: "Usuario inexistente" }, { status: 404 });
  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: "La verificación en dos pasos ya está activada" }, { status: 400 });
  }
  if (!user.twoFactorSecret) {
    return NextResponse.json({ error: "Primero generá el código QR de configuración" }, { status: 400 });
  }

  const ok = await verifyTotp(user.twoFactorSecret, parsed.data.code);
  if (!ok) {
    return NextResponse.json(
      { error: "Código incorrecto. Verificá la hora en tu aplicación de autenticación.", fields: { code: "Código inválido" } },
      { status: 400 }
    );
  }

  const recoveryCodes = generateRecoveryCodes(10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorRecovery: hashRecoveryCodes(recoveryCodes),
    },
  });

  await audit({
    action: "auth.2fa.enabled",
    resource: "auth",
    resourceId: user.id,
    details: `${user.email} activó la verificación en dos pasos`,
    request,
    userId: user.id,
  });

  const token = await signToken({
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: auth.payload.roleName,
    sid: auth.payload.sid,
    mustChangePassword: user.mustChangePassword,
    twoFactorEnabled: true,
  });

  const response = NextResponse.json({ success: true, recoveryCodes });
  if (auth.payload.sid) setSessionCookieOn(response, token);
  return response;
}
