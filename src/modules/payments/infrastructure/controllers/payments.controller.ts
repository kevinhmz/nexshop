import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Request } from "express";
import { ChargeDto } from "@modules/payments/application/dto";
import { ChargePaymentUseCase } from "@modules/payments/application/use-cases";
import { JwtAuthGuard } from "src/shared/guards";
import { IdempotencyInterceptor } from "src/shared/idempotency/idempotency.interceptor";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly chargePayment: ChargePaymentUseCase) {}

  @Post("charge")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  async charge(@Body() dto: ChargeDto, @Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.chargePayment.execute({
      amount: dto.amount,
      currency: dto.currency,
      paymentMethodId: dto.paymentMethodId,
      orderId: dto.orderId,
      userId,
      idempotencyKey: req.header("Idempotency-Key")!,
    });
  }
}
