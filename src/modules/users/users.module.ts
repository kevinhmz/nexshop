import { Module } from "@nestjs/common";
import { USER_REPOSITORY } from "./domain/ports/user-repository.port";
import { PrismaUserRepository } from "./infrastructure/adapters/prisma-user.repository";

@Module({
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
