import { z } from "zod";
import { NextResponse } from "next/server";

export const PASSWORD_STAFF = z
  .string()
  .min(12, "Usá al menos 12 caracteres")
  .max(128, "Máximo 128 caracteres")
  .regex(/[a-z]/, "Incluí al menos una minúscula")
  .regex(/[A-Z]/, "Incluí al menos una mayúscula")
  .regex(/\d/, "Incluí al menos un número")
  .regex(/[^A-Za-z0-9]/, "Incluí al menos un símbolo (!@#$%&*)");

export const PASSWORD_CUSTOMER = z
  .string()
  .min(8, "Usá al menos 8 caracteres")
  .max(128, "Máximo 128 caracteres")
  .regex(/[A-Za-z]/, "Incluí al menos una letra")
  .regex(/\d/, "Incluí al menos un número");

export function sanitizeText(value: string, max = 500): string {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeMultiline(value: string, max = 5000): string {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

export const safeText = (max = 500) =>
  z
    .string()
    .max(10_000)
    .transform((v) => sanitizeText(v, max));

export const safeMultiline = (max = 5000) =>
  z
    .string()
    .max(50_000)
    .transform((v) => sanitizeMultiline(v, max));

export const slugify = (value: string) =>
  sanitizeText(value, 200)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(191)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Email inválido");

export const phoneSchema = z
  .string()
  .trim()
  .min(6, "Teléfono muy corto")
  .max(30)
  .regex(/^[0-9+\s()-]+$/, "Teléfono inválido");

export function zodIssues(error: z.ZodError): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!issues[key]) issues[key] = issue.message;
  }
  return issues;
}

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ ok: true; data: z.output<T> } | { ok: false; response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Datos inválidos", fields: zodIssues(parsed.error) },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
