export interface TokenService {
  generateTokens(payload: { sub: string; email: string; role: string }): {
    accessToken: string;
    refreshToken: string;
  };
}

export const TOKEN_SERVICE = "TOKEN_SERVICE";
