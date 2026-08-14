import type { PaymentGateway, PaymentRequest, PaymentResponse } from "../types";

interface BancardConfig {
  publicKey: string;
  privateKey: string;
  isProduction: boolean;
}

export class BancardGateway implements PaymentGateway {
  readonly name = "bancard";
  private config: BancardConfig;

  constructor(config: BancardConfig) {
    this.config = config;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const baseUrl = this.config.isProduction
      ? "https://vpos.infonet.com.py"
      : "https://vpos.infonet.com.py:8888";

    const payload = {
      public_key: this.config.publicKey,
      operation: {
        token: request.orderNumber,
        shop_process_id: request.orderNumber,
        amount: Math.round(request.amount),
        currency: request.currency === "PYG" ? "600" : "000",
        additional_data: request.description,
        description: request.description,
        return_url: request.returnUrl || "",
        cancel_url: request.cancelUrl || "",
      },
    };

    try {
      const response = await fetch(`${baseUrl}/v3/api/vpos/creacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === "success" && data.confirmation_url) {
        return {
          success: true,
          redirectUrl: data.confirmation_url,
          status: "pending",
          transactionId: data.process_id,
        };
      }

      return {
        success: false,
        error: data.messages?.[0]?.dsc || "Error al procesar pago",
        status: "rejected",
      };
    } catch (error) {
      return {
        success: false,
        error: "Error de conexión con Bancard",
        status: "rejected",
      };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentResponse> {
    const baseUrl = this.config.isProduction
      ? "https://vpos.infonet.com.py"
      : "https://vpos.infonet.com.py:8888";

    try {
      const response = await fetch(
        `${baseUrl}/v3/api/vpos/confirmacion/${this.config.privateKey}/${transactionId}`
      );
      const data = await response.json();

      return {
        success: data.status === "success",
        status: data.status === "success" ? "approved" : "rejected",
        transactionId,
        error: data.messages?.[0]?.dsc,
      };
    } catch {
      return { success: false, status: "rejected", error: "Error de verificación" };
    }
  }

  async refundPayment(transactionId: string, _amount?: number): Promise<PaymentResponse> {
    return {
      success: false,
      status: "rejected",
      error: "Reembolso no implementado",
    };
  }
}
