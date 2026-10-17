import { prisma } from "./prisma";

export interface LoyaltyRuleData {
  id: string;
  pointsPer1000Gs: number;
  valuePerPointGs: number;
  minRedeemPoints: number;
  maxRedeemPercent: number;
  active: boolean;
}

const DEFAULT_RULE = {
  pointsPer1000Gs: 1,
  valuePerPointGs: 100,
  minRedeemPoints: 50,
  maxRedeemPercent: 20,
  active: true,
};

export async function getLoyaltyRule(): Promise<LoyaltyRuleData> {
  const rule = await prisma.loyaltyRule.findFirst();
  if (rule) return rule;
  return prisma.loyaltyRule.create({ data: DEFAULT_RULE });
}

export function calcEarnedPoints(totalGs: number, rule: LoyaltyRuleData): number {
  if (!rule.active || totalGs <= 0) return 0;
  const thousands = Math.floor(totalGs / 1000);
  return thousands * rule.pointsPer1000Gs;
}

export function calcRedeemDiscountGs(points: number, rule: LoyaltyRuleData): number {
  return Math.max(0, Math.round(points * rule.valuePerPointGs));
}

export function calcMaxRedeemPoints(subtotalAfterCoupon: number, rule: LoyaltyRuleData, balance: number): number {
  if (!rule.active) return 0;
  const maxByOrder = Math.floor((subtotalAfterCoupon * rule.maxRedeemPercent) / 100 / Math.max(1, rule.valuePerPointGs));
  return Math.max(0, Math.min(balance, maxByOrder));
}

export async function getLoyaltyBalance(customerId: string): Promise<number> {
  const agg = await prisma.loyaltyPoint.aggregate({
    where: { customerId },
    _sum: { points: true },
  });
  return agg._sum.points || 0;
}

export async function findOrCreateCustomerForOrder(opts: {
  userId: string | null;
  name: string;
  lastname?: string;
  email: string;
  phone: string;
}) {
  if (opts.userId) {
    const existing = await prisma.customer.findUnique({ where: { userId: opts.userId } });
    if (existing) return existing;
  }
  const byEmail = await prisma.customer.findFirst({ where: { email: opts.email.toLowerCase() } });
  if (byEmail) return byEmail;
  return prisma.customer.create({
    data: {
      userId: opts.userId || `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: opts.name,
      lastname: opts.lastname || "",
      document: `GUEST-${Date.now().toString(36).toUpperCase()}`,
      phone: opts.phone,
      email: opts.email.toLowerCase(),
    },
  });
}
