import { Cart } from "src/generated/prisma/client";

export interface CartRepository {
  findByUserId(userId: string): Promise<Cart | null>;
  addItem(userId: string, productId: string, quantity: number): Promise<Cart>;
  updateItemQuantity(
    userId: string,
    itemId: string,
    quantity: number,
  ): Promise<Cart>;
  removeItem(userId: string, itemId: string): Promise<Cart>;
  clear(userId: string): Promise<void>;
}

export const CART_REPOSITORY = "CART_REPOSITORY";
