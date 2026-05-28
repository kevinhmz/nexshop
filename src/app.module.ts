import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersModule } from "@modules/users/users.module";
import { AuthModule } from "@modules/auth/auth.module";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "./prisma/prisma.module";
import { CatalogModule } from "@modules/catalog/catalog.module";
import { CartModule } from "@modules/cart/cart.module";
import { OrdersModule } from "@modules/orders/orders.module";
import { HealthModule } from "@modules/health/health.module";
import { RedisModule } from "./shared/redis";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
