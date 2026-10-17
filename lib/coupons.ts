import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/validation";

export type CouponType = "percent" | "fixed";

export interface CouponValidation {
  ok: boolean;
  error?: string;
  discount?: number;
  coupon?: {
    id: string;
    code: string;
    type: string;
    value: number;
  };
}

export function normalizeCouponCode(raw: string): string {
  return sanitizeText(raw || "", 40).toUpperCase().replace(/\s+/g, "");
}

export function computeCouponDiscount(
  coupon: { type: string; value: number },
  subtotal: number
): number {
  const discount =
    coupon.type === "percent" ? Math.round(subtotal * (coupon.value / 100)) : Math.round(coupon.value);
  return Math.max(0, Math.min(discount, Math.round(subtotal)));
}

export async function validateCoupon(code: string, subtotal: number): Promise<CouponValidation> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return { ok: false, error: "Ingresá un código de cupón" };

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (!coupon || !coupon.isActive) return { ok: false, error: "Cupón inválido" };

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: "El cupón aún no está activo" };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, error: "El cupón expiró" };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "El cupón alcanzó su límite de usos" };
  }
  if (coupon.minPurchase != null && subtotal < coupon.minPurchase) {
    return {
      ok: false,
      error: `Este cupón requiere una compra mínima de Gs. ${Math.round(coupon.minPurchase).toLocaleString("es-PY")}`,
    };
  }

  const discount = computeCouponDiscount(coupon, subtotal);
  if (discount <= 0) return { ok: false, error: "El cupón no aplica a este subtotal" };

  return {
    ok: true,
    discount,
    coupon: { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value },
  };
}

export async function consumeCoupon(couponId: string): Promise<boolean> {
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon || !coupon.isActive) return false;
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return false;

  const res = await prisma.coupon.updateMany({
    where: { id: couponId, usedCount: coupon.usedCount },
    data: { usedCount: { increment: 1 } },
  });
  return res.count === 1;
}
