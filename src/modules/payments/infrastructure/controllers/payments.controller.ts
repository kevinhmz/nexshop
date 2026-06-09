import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ChargeDto } from "@modules/payments/application/dto";
import { ChargePaymentUseCase } from "@modules/payments/application/use-cases";
import { JwtAuthGuard } from "src/shared/guards";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly chargePayment: ChargePaymentUseCase) {}

  @Post("charge")
  @UseGuards(JwtAuthGuard)
  async charge(@Body() dto: ChargeDto, @Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.chargePayment.execute({
      amount: dto.amount,
      currency: dto.currency,
      paymentMethodId: dto.paymentMethodId,
      orderId: dto.orderId,
      userId,
    });
  }
}
