import { Order, OrderStatus } from "src/generated/prisma/client";

export interface OrderRepository {
  create(data: {
    userId: string;
    total: number;
    items: { productId: string; quantity: number; price: number }[];
  }): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string): Promise<Order[]>;
  updateStatus(id: string, status: OrderStatus): Promise<Order>;
}

export const ORDER_REPOSITORY = "ORDER_REPOSITORY";
