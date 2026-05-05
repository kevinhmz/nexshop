import {
  ORDER_REPOSITORY,
  OrderRepository,
} from "@modules/orders/domain/ports";
import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

@Injectable()
export class GetOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(orderId: string, userId: string, role: string) {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.userId !== userId && role !== "ADMIN") {
      throw new ForbiddenException("You can only view your own orders");
    }

    return order;
  }
}
