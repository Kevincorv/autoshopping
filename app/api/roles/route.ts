import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";

const RESOURCES = ["dashboard", "products", "categories", "brands", "stock", "purchases", "suppliers", "sales", "returns", "customers", "receivables", "cash", "reports", "settings", "users", "integrations", "notifications"];
const ACTIONS = ["view", "create", "update", "delete", "approve"];

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ roles, resources: RESOURCES, actions: ACTIONS });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener roles" }, { status: 500 });
  }
}

const roleSchema = z.object({ name: z.string().min(1), description: z.string().optional() });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const existing = await prisma.role.findUnique({ where: { name: parsed.data.name } });
    if (existing) return NextResponse.json({ error: "Ya existe un rol con ese nombre" }, { status: 409 });
    const role = await prisma.role.create({ data: parsed.data });
    await audit({ action: "create", resource: "roles", resourceId: role.id, details: `Rol creado: ${role.name}`, request });
    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al crear rol" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { roleId, permissions } = body as { roleId: string; permissions: { resource: string; actions: string[] }[] };
    const role = await prisma.role.findUnique({ where: { id: roleId }, include: { _count: { select: { users: true } } } });
    if (!role) return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });

    const permissionList = permissions.flatMap((p) =>
      p.actions.map((action) => ({ roleId, resource: p.resource, action }))
    );

    await prisma.$transaction(async (tx) => {
      await tx.permission.deleteMany({ where: { roleId } });
      if (permissionList.length > 0) {
        await tx.permission.createMany({ data: permissionList });
      }
    });
    await audit({ action: "update", resource: "roles", resourceId: role.id, details: `Permisos actualizados para ${role.name} (${permissionList.length} permisos)`, request });
    return NextResponse.json({ ok: true, count: permissionList.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar permisos" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!role) return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
    if (["admin", "vendedor", "cliente"].includes(role.name)) {
      return NextResponse.json({ error: "No se puede eliminar un rol del sistema" }, { status: 409 });
    }
    if (role._count.users > 0) {
      return NextResponse.json({ error: `El rol tiene ${role._count.users} usuarios asignados` }, { status: 409 });
    }
    await prisma.$transaction([
      prisma.permission.deleteMany({ where: { roleId: id } }),
      prisma.role.delete({ where: { id } }),
    ]);
    await audit({ action: "delete", resource: "roles", resourceId: id, details: `Rol eliminado: ${role.name}`, request });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al eliminar rol" }, { status: 500 });
  }
}