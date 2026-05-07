import { CART_REPOSITORY, CartRepository } from "@modules/cart/domain/ports";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class GetCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
  ) {}

  async execute(userId: string) {
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      return { items: [] };
    }
    return cart;
  }
}
