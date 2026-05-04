import { AddItemDto, UpdateItemDto } from "@modules/cart/application/dto";
import {
  AddToCartUseCase,
  GetCartUseCase,
} from "@modules/cart/application/use-cases";
import { CART_REPOSITORY, CartRepository } from "@modules/cart/domain/ports";
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { CurrentUser } from "src/shared/decorators";
import { JwtAuthGuard } from "src/shared/guards";

@UseGuards(JwtAuthGuard)
@Controller("cart")
export class CartController {
  constructor(
    private readonly addToCartUseCase: AddToCartUseCase,
    private readonly getCartUseCase: GetCartUseCase,
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
  ) {}

  @Get()
  getCart(@CurrentUser() user: { id: string }) {
    return this.getCartUseCase.execute(user.id);
  }

  @Post("items")
  addItem(@CurrentUser() user: { id: string }, @Body() dto: AddItemDto) {
    return this.addToCartUseCase.execute(user.id, dto.productId, dto.quantity);
  }

  @Patch("items/:id")
  updateItem(
    @CurrentUser() user: { id: string },
    @Param("id") itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartRepository.updateItemQuantity(
      user.id,
      itemId,
      dto.quantity,
    );
  }

  @Delete("items/:id")
  removeItem(@CurrentUser() user: { id: string }, @Param("id") itemId: string) {
    return this.cartRepository.removeItem(user.id, itemId);
  }
}
