import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, lastname: true, email: true, phone: true, isActive: true, createdAt: true, role: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body.name || "").trim();
    const lastname = (body.lastname || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const document = (body.document || "").trim();
    const password = body.password || "";
    const roleId = body.roleId || "";

    if (!name || !lastname || !email || !document || !password) {
      return NextResponse.json({ error: "Nombre, apellido, email, documento y contraseña son requeridos" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return NextResponse.json({ error: "Rol no válido" }, { status: 400 });

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { document }] } });
    if (existing) return NextResponse.json({ error: "Ya existe un usuario con ese email o documento" }, { status: 409 });

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        lastname,
        email,
        document,
        passwordHash,
        roleId: role.id,
        phone: body.phone || "",
        city: body.city || null,
        department: body.department || null,
        address: body.address || null,
        isActive: body.isActive ?? true,
      },
      select: { id: true, name: true, lastname: true, email: true, phone: true, isActive: true, createdAt: true, role: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("User create error:", error);
    return NextResponse.json({ error: "Error al crear el usuario" }, { status: 500 });
  }
}
