import { User } from "src/generated/prisma/client";

export interface UserRepositoryPort {
  create(data: Partial<User>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

export const USER_REPOSITORY = "USER_REPOSITORY";
