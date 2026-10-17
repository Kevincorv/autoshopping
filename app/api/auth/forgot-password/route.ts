import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, shell } from "@/lib/email";
import { rateLimit } from "@/lib/auth/rate-limit";
import { randomBytes, createHash } from "crypto";

export const dynamic = "force-dynamic";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const limiter = rateLimit(`forgot-password:${ip}`, 5, 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un minuto." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.isActive) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: hashToken(token), resetTokenExpires: expires },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetUrl = `${appUrl}/reset-password/${token}`;

      sendEmail({
        to: user.email,
        subject: "Restablecé tu contraseña de AutoShopping",
        html: shell(
          "Recuperación de contraseña",
          `<p>Hola ${user.name},</p>
           <p>Recibimos un pedido para restablecer tu contraseña. Hacé clic en el siguiente enlace (válido por 1 hora):</p>
           <p style="margin:20px 0;"><a href="${resetUrl}" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Restablecer contraseña</a></p>
           <p style="font-size:12px;color:#71717a;">Si no fuiste vos, ignorá este email. Tu contraseña no cambió.</p>`,
        ),
        template: "password-reset",
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      message: "Si existe una cuenta con ese email, te enviamos un enlace para restablecer tu contraseña.",
    });
  } catch {
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
