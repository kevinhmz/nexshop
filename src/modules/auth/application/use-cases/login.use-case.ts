import {
  TOKEN_SERVICE,
  TokenService,
} from "@modules/auth/domain/ports/token.service";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from "src/modules/users/domain/ports/user-repository.port";

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
  ) {}

  async execute(data: { email: string; password: string }) {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}
