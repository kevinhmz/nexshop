import {
  CreateProductDto,
  UpdateProductDto,
} from "@modules/catalog/application/dto";
import {
  CreateProductUseCase,
  ListProductsUseCase,
} from "@modules/catalog/application/use-cases";
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from "@modules/catalog/domain/ports";
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { Roles } from "src/shared/decorators/roles.decorator";
import { JwtAuthGuard, RolesGuard } from "src/shared/guards";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("products")
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  @Roles("ADMIN")
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.createProductUseCase.execute(dto);
  }

  @Get()
  findAll(
    @Query("categoryId") categoryId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.listProductsUseCase.execute({
      categoryId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.productRepository.findById(id);
  }

  @Roles("ADMIN")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.productRepository.update(id, dto);
  }

  @Roles("ADMIN")
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.productRepository.delete(id);
  }
}
