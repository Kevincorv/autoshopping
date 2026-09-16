export interface PaymentGatewayConfig {
  name: string;
  enabled: boolean;
  isProduction: boolean;
}

export interface PaymentRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  description: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    document?: string;
  };
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  qrCode?: string;
  error?: string;
  status: PaymentStatus;
}

export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled" | "refunded";

export interface PaymentGateway {
  readonly name: string;
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;
  verifyPayment(transactionId: string): Promise<PaymentResponse>;
  refundPayment(transactionId: string, amount?: number): Promise<PaymentResponse>;
}
