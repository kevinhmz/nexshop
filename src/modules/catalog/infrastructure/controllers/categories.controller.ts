import { CreateCategoryDto } from "@modules/catalog/application/dto";
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from "@modules/catalog/domain/ports";
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { Roles } from "src/shared/decorators/roles.decorator";
import { JwtAuthGuard, RolesGuard } from "src/shared/guards";

@Controller("categories")
export class CategoriesController {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryRepository.create(dto);
  }

  @Get()
  findAll() {
    return this.categoryRepository.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.categoryRepository.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: CreateCategoryDto) {
    return this.categoryRepository.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.categoryRepository.delete(id);
  }
}
