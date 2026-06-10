import { Injectable } from "@nestjs/common";
import { Prisma } from "src/generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

const TTL_MS = 24 * 60 * 60 * 1000;

export type AcquireResult =
  | { outcome: "acquired" }
  | { outcome: "cached"; status: number; body: unknown }
  | { outcome: "in_progress" }
  | { outcome: "conflict" };

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async tryAcquire(
    key: string,
    userId: string,
    requestHash: string,
  ): Promise<AcquireResult> {
    try {
      await this.prisma.idempotencyKey.create({
        data: {
          key,
          userId,
          requestHash,
          expiresAt: new Date(Date.now() + TTL_MS),
        },
      });
      return { outcome: "acquired" }; // ganamos la carrera
    } catch (e) {
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        e.code !== "P2002"
      )
        throw e;

      const existing = await this.prisma.idempotencyKey.findUnique({
        where: { key },
      });
      if (!existing) return { outcome: "conflict" };

      // pertenencia + mismo request: si no matchea, no confirmamos nada
      if (existing.userId !== userId || existing.requestHash !== requestHash) {
        return { outcome: "conflict" };
      }
      if (existing.status === "IN_PROGRESS") return { outcome: "in_progress" };
      // COMPLETED
      return {
        outcome: "cached",
        status: existing.responseStatus!,
        body: existing.responseBody,
      };
    }
  }

  async complete(key: string, status: number, body: unknown): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { key },
      data: {
        status: "COMPLETED",
        responseStatus: status,
        responseBody: body as Prisma.InputJsonValue,
      },
    });
  }

  async release(key: string): Promise<void> {
    await this.prisma.idempotencyKey
      .delete({ where: { key } })
      .catch(() => undefined);
  }
}
