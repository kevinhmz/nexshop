import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { JwtAuthGuard, RolesGuard } from "src/shared/guards";
import {
  ORDER_REPOSITORY,
  OrderRepository,
} from "@modules/orders/domain/ports";
import {
  CheckoutUseCase,
  GetOrderUseCase,
  ListOrdersUseCase,
} from "@modules/orders/application/use-cases";
import { CurrentUser, Roles } from "src/shared/decorators";
import { UpdateOrderStatusDto } from "@modules/orders/application/dto";

@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrdersController {
  constructor(
    private readonly checkoutUseCase: CheckoutUseCase,
    private readonly listOrdersUseCase: ListOrdersUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  @Post("checkout")
  checkout(@CurrentUser() user: { id: string }) {
    return this.checkoutUseCase.execute(user.id);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.listOrdersUseCase.execute(user.id);
  }

  @Get(":id")
  findOne(
    @Param("id") id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.getOrderUseCase.execute(id, user.id, user.role);
  }

  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orderRepository.updateStatus(id, dto.status as any);
  }
}
