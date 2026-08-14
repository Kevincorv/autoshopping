import crypto from "crypto";
import type { PaymentGateway, PaymentRequest, PaymentResponse } from "../types";

interface PagoParConfig {
  publicKey: string;
  privateToken: string;
  isProduction: boolean;
}

interface PagoParMethod {
  forma_pago: string;
  monto_minimo: number;
  porcentaje_comision: number;
  tipo: string;
}

interface PagoParCommerceData {
  descripcion: string;
  porcentaje_comision: number;
  forma_pago: PagoParMethod[];
  entorno: string;
  modo_pago_denominacion: string;
  contrato_firmado: boolean;
  permisos_link_venta: boolean;
  usuario: {
    email: string;
    nombre: string;
    apellido: string;
    saldo: number;
    pago_tarjeta: boolean;
  };
}

const API_BASE = "https://api.pagopar.com/api/comercios/2.0";
const API_CHECKOUT = "https://api.pagopar.com/api/comercios/2.0/checkout";

const METHOD_ICONS: Record<string, string> = {
  "Bancard - Tarjetas de crédito": "card",
  "Bancard - Catastrar Tarjeta": "card",
  "Bancard - V2.0": "card",
  "Procard - Tarjetas de crédito": "card",
  "Tigo Money": "wallet",
  "Billetera Personal": "mobile",
  "Pago Móvil": "mobile",
  "Pago Express": "qr",
  "Practipago": "cash",
  "Infonet Cobranzas": "cash",
  "Aqui Pago": "cash",
  "Contra Entrega": "cash",
  "Zimple": "wallet",
};

export class PagoParGateway implements PaymentGateway {
  readonly name = "pagopar";
  private config: PagoParConfig;

  constructor(config: PagoParConfig) {
    this.config = config;
  }

  private generateToken(action: string): string {
    return crypto
      .createHash("sha1")
      .update(this.config.privateToken + action)
      .digest("hex");
  }

  async getCommerceData(): Promise<{ success: boolean; data?: PagoParCommerceData; error?: string }> {
    try {
      const token = this.generateToken("DATOS-COMERCIO");
      const response = await fetch(`${API_BASE}/datos-comercio/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, public_key: this.config.publicKey }),
      });

      const result = await response.json();

      if (result.respuesta && result.resultado) {
        return { success: true, data: result.resultado };
      }
      return { success: false, error: result.resultado || "Error al obtener datos del comercio" };
    } catch {
      return { success: false, error: "Error de conexión con PagoPar" };
    }
  }

  getAvailableMethods(data: PagoParCommerceData): PaymentMethodInfo[] {
    const activeMethods = [
      "Bancard - Tarjetas de crédito",
      "Tigo Money",
      "Billetera Personal",
      "Pago Express",
      "Contra Entrega",
    ];

    return data.forma_pago
      .filter((m) => activeMethods.includes(m.forma_pago))
      .map((m) => ({
        name: m.forma_pago,
        minAmount: m.monto_minimo,
        commission: m.porcentaje_comision,
        icon: METHOD_ICONS[m.forma_pago] || "card",
        type: m.tipo,
      }));
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const token = this.generateToken("CHECKOUT");

    const payload = {
      token,
      public_key: this.config.publicKey,
      pedido: {
        descripcion: request.description,
        monto: Math.round(request.amount),
        monto_iva: 0,
        tipo_pedido: "VENTA-COMERCIO",
        id_pedido: request.orderNumber,
        id_cobrador: null,
        comprador: {
          email: request.customer.email,
          nombre: request.customer.name,
          apellido: request.customer.name.split(" ").slice(1).join(" ") || "",
          documento: request.customer.document || "",
          celular: request.customer.phone,
          direccion: "",
          ciudad: "",
        },
      },
      comprador: {
        email: request.customer.email,
        nombre: request.customer.name,
        apellido: request.customer.name.split(" ").slice(1).join(" ") || "",
        documento: request.customer.document || "",
        celular: request.customer.phone || "",
        direccion: "",
        ciudad: "",
      },
    };

    try {
      const response = await fetch(`${API_CHECKOUT}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.respuesta) {
        return {
          success: true,
          redirectUrl: result.resultado?.url_pago,
          transactionId: result.resultado?.proceso_id || result.resultado?.id_pedido,
          status: "pending",
        };
      }

      return {
        success: false,
        error: result.resultado || "Error al procesar pago",
        status: "rejected",
      };
    } catch (error) {
      return {
        success: false,
        error: "Error de conexión con PagoPar",
        status: "rejected",
      };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentResponse> {
    const token = this.generateToken("CONFIRMAR-PAGO");
    try {
      const response = await fetch(`${API_BASE}/confirmar-pago/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, public_key: this.config.publicKey, id_pedido: transactionId }),
      });
      const result = await response.json();
      return {
        success: result.respuesta,
        status: result.respuesta ? "approved" : "rejected",
        transactionId,
        error: !result.respuesta ? "Pago no confirmado" : undefined,
      };
    } catch {
      return { success: false, status: "rejected", error: "Error de verificación" };
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<PaymentResponse> {
    const token = this.generateToken("REEMBOLSO");
    try {
      const response = await fetch(`${API_BASE}/reembolso/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, public_key: this.config.publicKey, id_pedido: transactionId, monto: amount }),
      });
      const result = await response.json();
      return {
        success: result.respuesta,
        status: result.respuesta ? "approved" : "rejected",
        transactionId,
      };
    } catch {
      return { success: false, status: "rejected", error: "Error de reembolso" };
    }
  }
}

export interface PaymentMethodInfo {
  name: string;
  minAmount: number;
  commission: number;
  icon: string;
  type: string;
}
