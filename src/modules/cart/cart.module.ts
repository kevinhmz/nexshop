import { CatalogModule } from "@modules/catalog/catalog.module";
import { Module } from "@nestjs/common";
import { CartController } from "./infrastructure/controllers/cart.controller";
import { AddToCartUseCase, GetCartUseCase } from "./application/use-cases";
import { CART_REPOSITORY } from "./domain/ports";
import { PrismaCartRepository } from "./infrastructure/adapters/prisma-cart.repository";

@Module({
  imports: [CatalogModule],
  controllers: [CartController],
  providers: [
    AddToCartUseCase,
    GetCartUseCase,
    {
      provide: CART_REPOSITORY,
      useClass: PrismaCartRepository,
    },
  ],
  exports: [CART_REPOSITORY],
})
export class CartModule {}
