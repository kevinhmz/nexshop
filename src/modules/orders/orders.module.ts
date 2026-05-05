import { Module } from "@nestjs/common";
import {
  CheckoutUseCase,
  ListOrdersUseCase,
  GetOrderUseCase,
} from "./application/use-cases";
import { OrdersController } from "./infrastructure/controllers/orders.controller";
import { ORDER_REPOSITORY } from "./domain/ports";
import { PrismaOrderRepository } from "./infrastructure/adapters/prisma-order.repository";
import { CartModule } from "@modules/cart/cart.module";

@Module({
  imports: [CartModule],
  controllers: [OrdersController],
  providers: [
    CheckoutUseCase,
    ListOrdersUseCase,
    GetOrderUseCase,
    {
      provide: ORDER_REPOSITORY,
      useClass: PrismaOrderRepository,
    },
  ],
})
export class OrdersModule {}
