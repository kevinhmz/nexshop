import { Controller, Post, Body, Get } from "@nestjs/common";

@Controller("users")
export class UsersController {
  constructor() {}

  //   @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  // @Post('products')
  // create(@CurrentUser() user, @Body() dto) {
  @Get()
  register() {}
}
