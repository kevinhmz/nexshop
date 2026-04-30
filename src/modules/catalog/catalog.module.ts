import { Module } from "@nestjs/common";
import { ProductsController } from "./infrastructure/controllers/products.controller";
import { CategoriesController } from "./infrastructure/controllers/categories.controller";
import {
  CreateProductUseCase,
  ListProductsUseCase,
} from "./application/use-cases";
import { PrismaProductRepository } from "./infrastructure/adapters/prisma-product.repository";
import { CATEGORY_REPOSITORY, PRODUCT_REPOSITORY } from "./domain/ports";
import { PrismaCategoryRepository } from "./infrastructure/adapters/prisma-category.repository";

@Module({
  controllers: [ProductsController, CategoriesController],
  providers: [
    CreateProductUseCase,
    ListProductsUseCase,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
    {
      provide: CATEGORY_REPOSITORY,
      useClass: PrismaCategoryRepository,
    },
  ],
  exports: [PRODUCT_REPOSITORY],
})
export class CatalogModule {}
