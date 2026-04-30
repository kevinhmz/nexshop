import { Category } from "src/generated/prisma/client";

export interface CategoryRepository {
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  create(data: { name: string }): Promise<Category>;
  update(id: string, data: { name: string }): Promise<Category>;
  delete(id: string): Promise<void>;
}

export const CATEGORY_REPOSITORY = "CATEGORY_REPOSITORY";
