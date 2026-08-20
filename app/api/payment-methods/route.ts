import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    return NextResponse.json({ methods });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ methods: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });

    const existing = await prisma.paymentMethod.findFirst({ where: { name } });
    if (existing) return NextResponse.json({ error: "Ya existe un método con ese nombre" }, { status: 409 });

    const method = await prisma.paymentMethod.create({
      data: {
        name,
        type: body.type || "efectivo",
        icon: body.icon || null,
        description: body.description || null,
        commission: parseFloat(body.commission) || 0,
        minAmount: parseFloat(body.minAmount) || 0,
        sortOrder: parseInt(body.sortOrder) || 0,
        isActive: body.isActive !== false,
      },
    });
    await audit({ action: "create", resource: "settings", resourceId: method.id, details: `Método de pago creado: ${name}`, request });
    return NextResponse.json({ method }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear el método de pago" }, { status: 500 });
  }
}