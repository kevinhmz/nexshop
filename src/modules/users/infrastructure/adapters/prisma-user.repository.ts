import { Injectable } from "@nestjs/common";
import { User } from "src/generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { UserRepositoryPort } from "../../domain/ports/user-repository.port";

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
