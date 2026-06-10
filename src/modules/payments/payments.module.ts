import { Module } from "@nestjs/common";
import { ChargePaymentUseCase } from "./application/use-cases";
import { PAYMENT_GATEWAY } from "./domain/ports";
import { PaymentsController } from "./infrastructure/controllers/payments.controller";
import { StripePaymentAdapter } from "./infrastructure/adapters/stripe.payment.adapter";

@Module({
  controllers: [PaymentsController],
  providers: [
    ChargePaymentUseCase,
    {
      provide: PAYMENT_GATEWAY,
      useClass: StripePaymentAdapter,
    },
  ],
  exports: [ChargePaymentUseCase, PAYMENT_GATEWAY],
})
export class PaymentsModule {}
