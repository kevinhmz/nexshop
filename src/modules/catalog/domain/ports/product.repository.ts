import { Product } from "src/generated/prisma/client";

export interface ProductRepository {
  findAll(params?: {
    categoryId?: string;
    skip?: number;
    take?: number;
  }): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  create(data: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    categoryId: string;
  }): Promise<Product>;
  update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      stock: number;
      categoryId: string;
    }>,
  ): Promise<Product>;
  delete(id: string): Promise<void>;
  count(params?: { categoryId?: string }): Promise<number>;
}

export const PRODUCT_REPOSITORY = "PRODUCT_REPOSITORY";
