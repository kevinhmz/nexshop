import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from "class-validator";

export class ChargeDto {
  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsString()
  @IsNotEmpty()
  paymentMethodId!: string;

  @IsString()
  @IsUUID()
  orderId!: string;
}
