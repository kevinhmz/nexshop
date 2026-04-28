import { TokenService } from "@modules/auth/domain/ports/token.service";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(private readonly jwtService: JwtService) {}

  generateTokens(payload: { sub: string; email: string; role: string }) {
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: "7d" }),
    };
  }
}
