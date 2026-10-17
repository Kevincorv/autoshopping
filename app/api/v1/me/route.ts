import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { getLoyaltyBalance, getLoyaltyRule, calcRedeemDiscountGs } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(request as any);
  if (auth.response) return auth.response;
  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.payload.userId },
      select: {
        id: true, name: true, lastname: true, email: true, phone: true,
        city: true, department: true, address: true,
        role: { select: { name: true } },
        customerProfile: { select: { id: true } },
      },
    });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    let loyalty = { balance: 0, pointsValueGs: 0 };
    if (user.customerProfile) {
      const [rule, balance] = await Promise.all([getLoyaltyRule(), getLoyaltyBalance(user.customerProfile.id)]);
      loyalty = { balance, pointsValueGs: calcRedeemDiscountGs(balance, rule) };
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        city: user.city,
        department: user.department,
        role: user.role?.name,
      },
      loyalty,
    });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
