import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { z } from "zod";
import { PASSWORD_CUSTOMER, emailSchema, phoneSchema, safeText } from "@/lib/validation";
import { getClientIp } from "@/lib/auth/middleware";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session-store";
import { setSessionCookieOn } from "@/lib/auth/cookies";
import { audit } from "@/lib/audit";

const registerSchema = z.object({
  name: safeText(50).refine((v) => v.length >= 2, "Nombre muy corto"),
  lastname: safeText(50).refine((v) => v.length >= 2, "Apellido muy corto"),
  document: z
    .string()
    .trim()
    .min(3, "Documento inválido")
    .max(20)
    .transform((v) => v.replace(/[^\w\s.-]/g, "").slice(0, 20)),
  phone: phoneSchema,
  email: emailSchema,
  password: PASSWORD_CUSTOMER,
  city: safeText(100).optional(),
  department: safeText(100).optional(),
  address: safeText(200).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limiter = rateLimit(`register:ip:${ip || "unknown"}`, 5, 60 * 60_000);
    if (!limiter.ok) {
      return NextResponse.json(
        { error: "Demasiados registros desde esta conexión. Intentá más tarde." },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: first?.message || "Datos inválidos", field: first?.path.join(".") },
        { status: 400 }
      );
    }

    const { name, lastname, document, phone, email, password, city, department, address } = parsed.data;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const existingDoc = await prisma.user.findUnique({ where: { document } });
    if (existingDoc) {
      return NextResponse.json({ error: "El documento ya está registrado" }, { status: 409 });
    }

    const customerRole = await prisma.role.findUnique({ where: { name: "customer" } });
    if (!customerRole) {
      return NextResponse.json({ error: "Error de configuración" }, { status: 500 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        lastname,
        document,
        phone,
        email,
        passwordHash,
        roleId: customerRole.id,
        city,
        department,
        address,
        passwordChangedAt: new Date(),
      },
      select: { id: true, email: true, name: true, lastname: true, roleId: true },
    });

    await prisma.customer.create({
      data: {
        userId: user.id,
        name,
        lastname,
        document,
        phone,
        email,
        city,
        department,
        address,
      },
    });

    const session = await createSession({ userId: user.id, ipAddress: ip, userAgent: request.headers.get("user-agent") });
    const token = await signToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: "customer",
      sid: session.id,
      mustChangePassword: false,
      twoFactorEnabled: false,
    });

    await audit({
      action: "auth.register",
      resource: "auth",
      resourceId: user.id,
      details: `Registro de ${email}`,
      request,
      userId: user.id,
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, lastname: user.lastname, role: { name: "customer" } },
    });
    setSessionCookieOn(response, token, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
