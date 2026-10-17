import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request as any);
    if (auth.response) {
      return NextResponse.json({
        name: "AutoShopping API v1",
        version: "1.0.0",
        auth: "Bearer token (Authorization: Bearer <jwt>) o cookie de sesión",
        endpoints: {
          "GET /api/v1/products": "Catálogo con filtros: q, category, brand, vehicle, limit, offset",
          "GET /api/v1/orders": "Pedidos del usuario autenticado (Bearer o cookie)",
          "POST /api/v1/orders": "Crear pedido (auth requerido): items, customer, paymentMethod, couponCode?, pointsToRedeem?",
          "GET /api/v1/me": "Perfil del usuario autenticado + balance de puntos",
        },
      });
    }
    return NextResponse.json({
      name: "AutoShopping API v1",
      version: "1.0.0",
      user: { id: auth.payload.userId, email: auth.payload.email, role: auth.payload.roleName },
      endpoints: [
        "GET /api/v1/products",
        "GET /api/v1/orders",
        "POST /api/v1/orders",
        "GET /api/v1/me",
      ],
    });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
