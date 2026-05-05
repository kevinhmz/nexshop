import { Inject, Injectable, BadRequestException } from "@nestjs/common";
import { CART_REPOSITORY, CartRepository } from "@modules/cart/domain/ports";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class CheckoutUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(userId: string) {
    const cart = await this.cartRepository.findByUserId(userId);
    cart.items;
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    const order = await this.prisma.$transaction(async (tx) => {
      let total = 0;
      const orderItems: {
        productId: string;
        quantity: number;
        price: number;
      }[] = [];

      for (const item of cart.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(`Not enough stock for ${product.name}`);
        }

        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });

        const price = Number(product.price);
        total += price * item.quantity;
        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          price,
        });
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          total,
          items: {
            create: orderItems,
          },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({
        where: { cart: { userId } },
      });

      return newOrder;
    });

    this.eventEmitter.emit("order.created", { orderId: order.id, userId });

    return order;
  }
}
