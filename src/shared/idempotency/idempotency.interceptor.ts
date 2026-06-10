import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Request, Response } from "express";
import { createHash } from "crypto";
import { Observable, of, from, throwError, concatMap, catchError } from "rxjs";
import { IdempotencyService } from "./idempotency.service";
import { IdempotencyError } from "./idempotency.error";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotency: IdempotencyService) {}

  async intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();

    const key = req.header("Idempotency-Key");
    if (!key)
      throw new IdempotencyError(
        "Idempotency-Key header is required",
        "VALIDATION",
      );

    const userId = (req.user as { id: string }).id;
    const requestHash = createHash("sha256")
      .update(JSON.stringify(req.body ?? {}))
      .digest("hex");

    const acquired = await this.idempotency.tryAcquire(
      key,
      userId,
      requestHash,
    );

    switch (acquired.outcome) {
      case "cached":
        res.status(acquired.status);
        return of(acquired.body);
      case "in_progress":
        throw new IdempotencyError(
          "Request already in progress, retry shortly",
          "CONFLICT",
        );
      case "conflict":
        throw new IdempotencyError(
          "Idempotency-Key reused with a different request",
          "CONFLICT",
        );
      case "acquired":
        return next.handle().pipe(
          concatMap(async (body) => {
            await this.idempotency.complete(key, res.statusCode, body);
            return body;
          }),
          catchError((err) =>
            from(this.idempotency.release(key)).pipe(
              concatMap(() => throwError(() => err)),
            ),
          ),
        );
    }
  }
}
