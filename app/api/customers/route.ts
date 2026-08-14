import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";

const createSchema = z.object({
  name: z.string().min(1),
  lastname: z.string().min(1),
  document: z.string().min(1),
  phone: z.string(),
  whatsapp: z.string().optional(),
  email: z.string().email(),
  city: z.string().optional(),
  department: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase() || "";
    const blocked = url.searchParams.get("blocked");
    const withDebt = url.searchParams.get("debt");
    const orderBy = url.searchParams.get("orderBy") || "createdAt";

    const where: Record<string, unknown> = {};
    if (blocked === "1") where.isBlocked = true;
    if (blocked === "0") where.isBlocked = false;
    if (withDebt === "1") where.balance = { gt: 0 };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { lastname: { contains: q } },
        { email: { contains: q } },
        { document: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: { _count: { select: { orders: true } } },
      orderBy: orderBy === "balance" ? { balance: "desc" } : { createdAt: "desc" },
      take: 200,
    });

    const stats = await prisma.customer.aggregate({
      _count: { _all: true },
      _sum: { balance: true },
    });
    const blockedCount = await prisma.customer.count({ where: { isBlocked: true } });

    return NextResponse.json({
      customers,
      stats: { total: stats._count._all, totalBalance: stats._sum.balance || 0, blocked: blockedCount },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos: " + JSON.stringify(parsed.error.flatten().fieldErrors) }, { status: 400 });
    }
    const d = parsed.data;
    const session = await getSessionUser();

    const existing = await prisma.customer.findFirst({
      where: { OR: [{ document: d.document }, { email: d.email }, { user: { email: d.email } }] },
    });
    if (existing) return NextResponse.json({ error: "Ya existe un cliente con ese documento o email" }, { status: 409 });

    const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(2) + Date.now(), 10);
    const customerRole = await prisma.role.findUnique({ where: { name: "customer" } });
    if (!customerRole) return NextResponse.json({ error: "Rol customer no existe" }, { status: 500 });

    const customer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: d.name,
          lastname: d.lastname,
          document: d.document,
          phone: d.phone || "000",
          whatsapp: d.whatsapp || null,
          email: d.email,
          passwordHash: tempPassword,
          city: d.city || null,
          department: d.department || null,
          address: d.address || null,
          roleId: customerRole.id,
        },
      });
      return tx.customer.create({
        data: {
          userId: user.id,
          name: d.name,
          lastname: d.lastname,
          document: d.document,
          phone: d.phone || "000",
          whatsapp: d.whatsapp || null,
          email: d.email,
          city: d.city || null,
          department: d.department || null,
          address: d.address || null,
          notes: d.notes || null,
        },
      });
    });

    await audit({
      action: "create",
      resource: "customers",
      resourceId: customer.id,
      details: `Cliente creado: ${d.name} ${d.lastname} (${d.document})`,
      request,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
  }
}