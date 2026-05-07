import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from "@modules/catalog/domain/ports";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(params?: {
    categoryId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.productRepository.findAll({
        categoryId: params?.categoryId,
        skip,
        take: limit,
      }),
      this.productRepository.count({ categoryId: params?.categoryId }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
