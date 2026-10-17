import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";
import { sanitizeText } from "@/lib/validation";

const PATCHABLE_FIELDS = [
  "name",
  "lastname",
  "document",
  "phone",
  "whatsapp",
  "email",
  "city",
  "department",
  "address",
  "roleId",
  "isActive",
  "mustChangePassword",
] as const;

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const body = (await request.json()) || {};
    const data: Record<string, unknown> = {};
    for (const key of PATCHABLE_FIELDS) {
      if (!(key in body)) continue;
      const value = body[key];
      if (typeof value === "string" && key !== "roleId") {
        data[key] = sanitizeText(value, 200);
      } else if (typeof value === "boolean" || typeof value === "string") {
        data[key] = value;
      }
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
    }
    const user = await prisma.user.update({ where: { id: params.id }, data });
    const { passwordHash, twoFactorSecret, twoFactorRecovery, ...safe } = user;
    return NextResponse.json({ user: safe });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}
