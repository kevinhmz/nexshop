import { Controller, Post, Body } from "@nestjs/common";
import { LoginDto, RegisterDto } from "@modules/auth/application/dto";
import {
  LoginUseCase,
  RegisterUseCase,
} from "@modules/auth/application/use-cases";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }
}
