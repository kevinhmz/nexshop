import { OrderRepository } from "@modules/orders/domain/ports";
import { Injectable } from "@nestjs/common";
import { Order, OrderStatus } from "src/generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    total: number;
    items: { productId: string; quantity: number; price: number }[];
  }): Promise<Order> {
    return this.prisma.order.create({
      data: {
        userId: data.userId,
        total: data.total,
        items: {
          create: data.items,
        },
      },
      include: { items: true },
    });
  }

  async findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });
  }
}
