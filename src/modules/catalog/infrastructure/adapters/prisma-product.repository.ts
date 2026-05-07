import {
  CreateProductDto,
  UpdateProductDto,
} from "@modules/catalog/application/dto";
import { ProductRepository } from "@modules/catalog/domain/ports";
import { Injectable } from "@nestjs/common";
import { Product } from "src/generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductDto): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  async findAll(params?: {
    categoryId?: string;
    skip?: number;
    take?: number;
  }): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: params?.categoryId ? { categoryId: params.categoryId } : undefined,
      skip: params?.skip,
      take: params?.take,
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateProductDto): Promise<Product> {
    return this.prisma.product.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }

  async count(params?: { categoryId?: string }): Promise<number> {
    return this.prisma.product.count({
      where: params?.categoryId ? { categoryId: params.categoryId } : undefined,
    });
  }
}
