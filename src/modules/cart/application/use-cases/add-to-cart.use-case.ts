import { CART_REPOSITORY, CartRepository } from "@modules/cart/domain/ports";
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from "@modules/catalog/domain/ports";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class AddToCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(userId: string, productId: string, quantity: number) {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (product.stock < quantity) {
      throw new NotFoundException("Not enough stock");
    }

    return this.cartRepository.addItem(userId, productId, quantity);
  }
}
