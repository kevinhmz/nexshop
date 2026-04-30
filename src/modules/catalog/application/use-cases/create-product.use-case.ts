import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CreateProductDto } from "../dto";
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
  PRODUCT_REPOSITORY,
  ProductRepository,
} from "@modules/catalog/domain/ports";

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(dto: CreateProductDto) {
    const category = await this.categoryRepository.findById(dto.categoryId);
    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return this.productRepository.create(dto);
  }
}
