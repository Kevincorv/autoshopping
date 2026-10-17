import type { PaymentGateway, PaymentRequest, PaymentResponse } from "./types";
import { BancardGateway } from "./gateways/bancard";
import { PagoParGateway } from "./gateways/pagopar";
import type { PaymentMethodInfo } from "./gateways/pagopar";

const gateways = new Map<string, PaymentGateway>();

const bancardConfig = {
  publicKey: process.env.BANCARD_PUBLIC_KEY || "",
  privateKey: process.env.BANCARD_PRIVATE_KEY || "",
  isProduction: process.env.NODE_ENV === "production",
};

if (bancardConfig.publicKey && bancardConfig.privateKey) {
  registerGateway("bancard", new BancardGateway(bancardConfig));
}

const pagoparConfig = {
  publicKey: process.env.PAGOPAR_PUBLIC_KEY || "",
  privateToken: process.env.PAGOPAR_PRIVATE_TOKEN || "",
  isProduction: process.env.NODE_ENV === "production",
};

let pagoparInstance: PagoParGateway | null = null;

if (pagoparConfig.publicKey && pagoparConfig.privateToken) {
  pagoparInstance = new PagoParGateway(pagoparConfig);
  registerGateway("pagopar", pagoparInstance);
}

export function registerGateway(name: string, gateway: PaymentGateway): void {
  gateways.set(name, gateway);
}

export function getGateway(name: string): PaymentGateway | undefined {
  return gateways.get(name);
}

export function getAvailableGateways(): string[] {
  return Array.from(gateways.keys());
}

export async function getPaymentMethods(): Promise<{
  provider: string;
  commission: number | null;
  methods: PaymentMethodInfo[];
  commerceData?: any;
}> {
  const fallback = {
    provider: "manual",
    commission: null,
    methods: [
      { name: "Transferencia bancaria", minAmount: 0, commission: 0, icon: "bank", type: "Manual" },
      { name: "Pago Express (QR)", minAmount: 0, commission: 0, icon: "qr", type: "Manual" },
      { name: "Contra Entrega", minAmount: 0, commission: 0, icon: "cash", type: "Manual" },
    ],
  };

  if (!pagoparInstance) return fallback;

  try {
    const result = await pagoparInstance.getCommerceData();
    if (result.success && result.data) {
      return {
        provider: "pagopar",
        commission: result.data.porcentaje_comision,
        methods: pagoparInstance.getAvailableMethods(result.data),
        commerceData: {
          commerce: result.data.descripcion,
          environment: result.data.entorno,
          hasCard: result.data.usuario?.pago_tarjeta,
        },
      };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function processPayment(
  gatewayName: string,
  request: PaymentRequest
): Promise<PaymentResponse> {
  const gateway = gateways.get(gatewayName);
  if (!gateway) {
    return {
      success: false,
      status: "rejected",
      error: `Gateway "${gatewayName}" no disponible`,
    };
  }
  return gateway.processPayment(request);
}

export async function verifyPayment(
  gatewayName: string,
  transactionId: string
): Promise<PaymentResponse> {
  const gateway = gateways.get(gatewayName);
  if (!gateway) {
    return { success: false, status: "rejected", error: "Gateway no disponible" };
  }
  return gateway.verifyPayment(transactionId);
}
