import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/auth/middleware";
import { validateCoupon } from "@/lib/coupons";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().min(1).max(40),
  subtotal: z.number().nonnegative(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limiter = rateLimit(`coupon-validate:${ip || "unknown"}`, 30, 60_000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Demasiadas consultas. Esperá un minuto." }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Código y subtotal requeridos" }, { status: 400 });
    }

    const result = await validateCoupon(parsed.data.code, parsed.data.subtotal);
    if (!result.ok) {
      return NextResponse.json({ error: result.error, ok: false }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      discount: result.discount,
      coupon: result.coupon,
    });
  } catch {
    return NextResponse.json({ error: "Error al validar cupón" }, { status: 500 });
  }
}
