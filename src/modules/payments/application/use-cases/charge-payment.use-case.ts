import {
  ChargeResult,
  PAYMENT_GATEWAY,
  PaymentGatewayPort,
} from "@modules/payments/domain/ports/payment-gateway.port";
import { Inject, Injectable } from "@nestjs/common";
export interface ChargePaymentInput {
  amount: number;
  currency: string;
  paymentMethodId: string;
  orderId: string;
  userId: string;
  idempotencyKey: string;
}

@Injectable()
export class ChargePaymentUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: PaymentGatewayPort,
  ) {}

  async execute(input: ChargePaymentInput): Promise<ChargeResult> {
    return this.gateway.charge({
      amount: input.amount,
      currency: input.currency,
      paymentMethodId: input.paymentMethodId,
      metadata: { orderId: input.orderId, userId: input.userId },
      idempotencyKey: input.idempotencyKey,
    });
  }
}
