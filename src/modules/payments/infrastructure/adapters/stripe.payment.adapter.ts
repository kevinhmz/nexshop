import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PaymentError } from "@modules/payments/domain/errors/payment.error";
import {
  ChargeInput,
  ChargeResult,
  PaymentGatewayPort,
} from "@modules/payments/domain/ports/payment-gateway.port";

@Injectable()
export class StripePaymentAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger(StripePaymentAdapter.name);
  private readonly stripe: Stripe;

  constructor(config: ConfigService) {
    this.stripe = new Stripe(config.getOrThrow<string>("STRIPE_SECRET_KEY"));
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    try {
      const intent = await this.stripe.paymentIntents.create(
        {
          amount: input.amount,
          currency: input.currency,
          payment_method: input.paymentMethodId,
          payment_method_types: ["card"],
          confirm: true,
          metadata: input.metadata,
        },
        { idempotencyKey: input.idempotencyKey },
      );

      return {
        paymentIntentId: intent.id,
        status: intent.status,
        clientSecret: intent.client_secret ?? undefined,
        nextActionUrl:
          intent.next_action?.type === "redirect_to_url"
            ? (intent.next_action.redirect_to_url?.url ?? undefined)
            : undefined,
      };
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError) {
        this.logger.warn(`Stripe error: ${err.type} - ${err.message}`);
        throw new PaymentError(err.message, err.code);
      }
      this.logger.error("charge failed", err);
      throw new PaymentError("charge failed");
    }
  }
}
