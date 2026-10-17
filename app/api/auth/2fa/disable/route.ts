import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { setSessionCookieOn } from "@/lib/auth/cookies";
import { parseBody } from "@/lib/validation";
import { rateLimit } from "@/lib/auth/rate-limit";
import { z } from "zod";
import { audit } from "@/lib/audit";

const schema = z.object({ password: z.string().min(1, "Ingresá tu contraseña").max(200) });

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const limiter = rateLimit(`2fa-disable:${auth.payload.userId}`, 5, 60 * 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Demasiados intentos. Intentá más tarde." }, { status: 429 });
  }

  const parsed = await parseBody(request, schema);
  if (!parsed.ok) return parsed.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.payload.userId },
    include: { role: { select: { name: true } } },
  });
  if (!user) return NextResponse.json({ error: "Usuario inexistente" }, { status: 404 });
  if (!user.twoFactorEnabled) {
    return NextResponse.json({ error: "La verificación en dos pasos no está activada" }, { status: 400 });
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 400 });
  }

  if (user.role.name === "admin") {
    return NextResponse.json(
      { error: "Para el administrador la verificación en dos pasos es obligatoria" },
      { status: 403 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecovery: null },
  });

  await audit({
    action: "auth.2fa.disabled",
    resource: "auth",
    resourceId: user.id,
    details: `${user.email} desactivó la verificación en dos pasos`,
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
    twoFactorEnabled: false,
  });

  const response = NextResponse.json({ success: true });
  if (auth.payload.sid) setSessionCookieOn(response, token);
  return response;
}
