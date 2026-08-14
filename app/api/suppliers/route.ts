import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";

const schema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  ruc: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  contactsJson: z.string().optional(),
});

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: { select: { purchases: true } },
      },
      orderBy: { name: "asc" },
    });
    const totalDebt = suppliers.reduce((s, sp) => s + sp.balance, 0);
    return NextResponse.json({ suppliers, stats: { total: suppliers.length, debt: totalDebt } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener proveedores" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const d = parsed.data;

    let code = d.code?.trim();
    if (!code) {
      const count = await prisma.supplier.count();
      code = `PROV-${String(count + 1).padStart(3, "0")}`;
    }
    const existing = await prisma.supplier.findFirst({ where: { OR: [{ code }, { name: d.name }] } });
    if (existing) return NextResponse.json({ error: "Código o nombre ya existente" }, { status: 409 });

    const supplier = await prisma.supplier.create({
      data: {
        code, name: d.name,
        ruc: d.ruc || null, email: d.email || null, phone: d.phone || null, whatsapp: d.whatsapp || null,
        address: d.address || null, city: d.city || null, notes: d.notes || null,
        paymentTerms: d.paymentTerms || null, contacts: d.contactsJson || null,
      },
    });
    await audit({ action: "create", resource: "suppliers", resourceId: supplier.id, details: `Proveedor creado: ${d.name} (${code})`, request });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear proveedor" }, { status: 500 });
  }
}