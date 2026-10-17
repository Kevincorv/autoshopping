import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";
import { createTotpSecret, otpauthUri, qrDataUrl } from "@/lib/auth/totp";
import { audit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const user = await prisma.user.findUnique({ where: { id: auth.payload.userId } });
  if (!user) return NextResponse.json({ error: "Usuario inexistente" }, { status: 404 });
  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: "La verificación en dos pasos ya está activada" }, { status: 400 });
  }

  const secret = await createTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });

  const accountName = user.email;
  const uri = otpauthUri(secret, accountName);
  const qr = await qrDataUrl(uri);

  await audit({
    action: "auth.2fa.setup",
    resource: "auth",
    resourceId: user.id,
    details: `${user.email} generó secreto TOTP pendiente de confirmación`,
    request,
    userId: user.id,
  });

  return NextResponse.json({ secret, uri, qr });
}
