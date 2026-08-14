import { NextResponse } from "next/server";
import { getPaymentMethods } from "@/lib/payments/registry";

export async function GET() {
  try {
    const data = await getPaymentMethods();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      provider: "pagopar",
      commission: null,
      methods: [
        { name: "Tarjetas de crédito/débito", minAmount: 1000, commission: 0, icon: "card" },
        { name: "Tigo Money", minAmount: 1000, commission: 0, icon: "wallet" },
        { name: "Billetera Personal", minAmount: 1000, commission: 0, icon: "mobile" },
        { name: "Pago Express (QR)", minAmount: 1000, commission: 0, icon: "qr" },
        { name: "Contra Entrega", minAmount: 1000, commission: 0, icon: "cash" },
      ],
    });
  }
}
