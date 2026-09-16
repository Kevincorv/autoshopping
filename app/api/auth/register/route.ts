import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  lastname: z.string().min(2).max(50),
  document: z.string().min(3).max(20),
  phone: z.string().min(6).max(20),
  email: z.string().email().max(100),
  password: z.string().min(6).max(100),
  city: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  address: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
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

    const token = await signToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: "customer",
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, lastname: user.lastname, role: "customer" },
    });

    response.cookies.set(AUTH_CONFIG.cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
