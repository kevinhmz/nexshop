import { Inject, Injectable, ConflictException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from "src/modules/users/domain/ports/user-repository.port";

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(data: { email: string; password: string; name: string }) {
    const existing = await this.userRepository.findByEmail(data.email);

    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.userRepository.create({
      ...data,
      password: hashedPassword,
    });

    const { password, ...result } = user;
    return result;
  }
}
