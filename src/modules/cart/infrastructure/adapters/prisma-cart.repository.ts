import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { Cart } from "src/generated/prisma/client";
import { CartRepository } from "@modules/cart/domain/ports";

@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<Cart | null> {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async addItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<Cart> {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: {
        userId,
        items: {
          create: { productId, quantity },
        },
      },
      update: {
        items: {
          upsert: {
            where: { cartId_productId: { cartId: "", productId } },
            create: { productId, quantity },
            update: { quantity: { increment: quantity } },
          },
        },
      },
      include: { items: { include: { product: true } } },
    });

    return cart;
  }

  //   async addItem(userId: string, productId: string, quantity: number): Promise<Cart> {
  //   let cart = await this.prisma.cart.findUnique({ where: { userId } });

  //   if (!cart) {
  //     cart = await this.prisma.cart.create({ data: { userId } });
  //   }

  //   const existingItem = await this.prisma.cartItem.findUnique({
  //     where: { cartId_productId: { cartId: cart.id, productId } },
  //   });

  //   if (existingItem) {
  //     await this.prisma.cartItem.update({
  //       where: { id: existingItem.id },
  //       data: { quantity: existingItem.quantity + quantity },
  //     });
  //   } else {
  //     await this.prisma.cartItem.create({
  //       data: { cartId: cart.id, productId, quantity },
  //     });
  //   }

  //   return this.findByUserId(userId);
  // }
  async updateItemQuantity(
    userId: string,
    itemId: string,
    quantity: number,
  ): Promise<Cart> {
    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return this.findByUserId(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<Cart> {
    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.findByUserId(userId);
  }

  async clear(userId: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }
}
