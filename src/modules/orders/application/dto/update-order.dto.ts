import { IsEnum } from "class-validator";

export class UpdateOrderStatusDto {
  @IsEnum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ])
  status: string;
}
