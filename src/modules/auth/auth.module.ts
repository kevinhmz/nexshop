import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./infrastructure/controllers/auth.controller";
import {
  LoginUseCase,
  RegisterUseCase,
} from "@modules/auth/application/use-cases";
import { TOKEN_SERVICE } from "./domain/ports/token.service";
import { JwtTokenService } from "./infrastructure/adapters/jwt-token.service";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./infrastructure/adapters/jwt.strategy";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get("JWT_SECRET"),
        signOptions: { expiresIn: config.get("JWT_EXPIRES_IN") },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    JwtStrategy,
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
  ],
})
export class AuthModule {}
