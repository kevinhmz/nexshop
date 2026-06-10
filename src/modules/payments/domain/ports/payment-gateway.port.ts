export const PAYMENT_GATEWAY = "PAYMENT_GATEWAY";

export interface ChargeInput {
  amount: number; // centavos
  currency: string; // "usd", "eur", "ars"
  paymentMethodId: string;
  metadata: {
    orderId: string;
    userId: string;
    [key: string]: string;
  };
  idempotencyKey: string;
}

export interface ChargeResult {
  paymentIntentId: string;
  status: string;
  clientSecret?: string;
  nextActionUrl?: string;
}

export interface PaymentGatewayPort {
  charge(input: ChargeInput): Promise<ChargeResult>;
}
