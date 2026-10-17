import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { getLoyaltyRule, getLoyaltyBalance, calcRedeemDiscountGs } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(request as any);
  if (auth.response) return auth.response;
  try {
    const customer = await prisma.customer.findFirst({
      where: { OR: [{ userId: auth.payload.userId }, { email: auth.payload.email }] },
    });
    if (!customer) {
      return NextResponse.json({ balance: 0, pointsValueGs: 0, history: [], rule: null });
    }

    const [rule, balance, history] = await Promise.all([
      getLoyaltyRule(),
      getLoyaltyBalance(customer.id),
      prisma.loyaltyPoint.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      balance,
      pointsValueGs: calcRedeemDiscountGs(balance, rule),
      history,
      rule: {
        pointsPer1000Gs: rule.pointsPer1000Gs,
        valuePerPointGs: rule.valuePerPointGs,
        minRedeemPoints: rule.minRedeemPoints,
        maxRedeemPercent: rule.maxRedeemPercent,
        active: rule.active,
      },
    });
  } catch {
    return NextResponse.json({ balance: 0, pointsValueGs: 0, history: [], rule: null });
  }
}
