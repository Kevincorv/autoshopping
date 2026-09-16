import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  logo: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ brands });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al obtener marcas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const d = parsed.data;
    const slug = d.slug?.trim() || slugify(d.name);
    const existing = await prisma.brand.findFirst({ where: { OR: [{ name: d.name }, { slug }] } });
    if (existing) return NextResponse.json({ error: "Ya existe una marca con ese nombre" }, { status: 409 });

    const brand = await prisma.brand.create({
      data: { name: d.name, slug, logo: d.logo || null, description: d.description || null, isActive: d.isActive ?? true },
    });
    await audit({ action: "create", resource: "brands", resourceId: brand.id, details: `Marca creada: ${d.name}`, request });
    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear marca" }, { status: 500 });
  }
}