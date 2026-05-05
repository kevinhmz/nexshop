import {
  ORDER_REPOSITORY,
  OrderRepository,
} from "@modules/orders/domain/ports";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class ListOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(userId: string) {
    return this.orderRepository.findByUserId(userId);
  }
}
