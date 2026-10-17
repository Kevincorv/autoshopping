import { NextResponse } from "next/server";
import { getPaymentMethods } from "@/lib/payments/registry";

export async function GET() {
  try {
    const data = await getPaymentMethods();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      provider: "manual",
      commission: null,
      methods: [
        { name: "Transferencia bancaria", minAmount: 0, commission: 0, icon: "bank" },
        { name: "Pago Express (QR)", minAmount: 0, commission: 0, icon: "qr" },
        { name: "Contra Entrega", minAmount: 0, commission: 0, icon: "cash" },
      ],
    });
  }
}
