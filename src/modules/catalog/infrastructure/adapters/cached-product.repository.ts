import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import Redis from "ioredis";
import { Product } from "src/generated/prisma/client";
import { ProductRepository } from "@modules/catalog/domain/ports";
import {
  CreateProductDto,
  UpdateProductDto,
} from "@modules/catalog/application/dto";
import { REDIS_CLIENT } from "src/shared/redis";
import { getWithSwr } from "src/shared/cache";

export const INNER_PRODUCT_REPOSITORY = "INNER_PRODUCT_REPOSITORY";

const DETAIL_FRESH_TTL = 15 * 60;
const DETAIL_HARD_TTL = 30 * 60;
const LIST_FRESH_TTL = 5 * 60;
const LIST_HARD_TTL = 15 * 60;

const LIST_VERSION_KEY = "products:list:version";
const detailKey = (id: string) => `product:${id}`;

@Injectable()
export class CachedProductRepository implements ProductRepository {
  private readonly logger = new Logger(CachedProductRepository.name);

  constructor(
    @Inject(INNER_PRODUCT_REPOSITORY)
    private readonly inner: ProductRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async findById(id: string): Promise<Product | null> {
    return getWithSwr({
      redis: this.redis,
      key: detailKey(id),
      freshTtlSeconds: DETAIL_FRESH_TTL,
      hardTtlSeconds: DETAIL_HARD_TTL,
      fetcher: () => this.inner.findById(id),
    });
  }

  async findAll(params?: {
    categoryId?: string;
    skip?: number;
    take?: number;
  }): Promise<Product[]> {
    const version = await this.getListVersion();
    const key = `products:list:v${version}:${this.hashParams(params)}`;

    return getWithSwr({
      redis: this.redis,
      key,
      freshTtlSeconds: LIST_FRESH_TTL,
      hardTtlSeconds: LIST_HARD_TTL,
      fetcher: () => this.inner.findAll(params),
    });
  }

  async count(params?: { categoryId?: string }): Promise<number> {
    // No cacheado: es barato y rara vez es el cuello de botella.
    // Si en el futuro duele, mismo patrón versioned-key.
    return this.inner.count(params);
  }

  // ─── Escrituras (pasan a inner + invalidan) ────────────────

  async create(data: CreateProductDto): Promise<Product> {
    const product = await this.inner.create(data);
    await this.invalidateLists();
    return product;
  }

  async update(id: string, data: UpdateProductDto): Promise<Product> {
    const product = await this.inner.update(id, data);
    await Promise.all([this.invalidateDetail(id), this.invalidateLists()]);
    return product;
  }

  async delete(id: string): Promise<void> {
    await this.inner.delete(id);
    await Promise.all([this.invalidateDetail(id), this.invalidateLists()]);
  }

  // ─── Internals ─────────────────────────────────────────────

  private async getListVersion(): Promise<number> {
    try {
      const v = await this.redis.get(LIST_VERSION_KEY);
      return v === null ? 0 : Number(v);
    } catch (err) {
      // Si Redis falla acá, asumimos versión 0 — la lectura igual
      // degradará al fetcher dentro de getWithSwr.
      this.logger.warn(
        `Failed reading list version, defaulting to 0: ${(err as Error).message}`,
      );
      return 0;
    }
  }

  private async invalidateDetail(id: string): Promise<void> {
    try {
      await this.redis.del(detailKey(id));
    } catch (err) {
      this.logger.warn(
        `Failed invalidating detail ${id}: ${(err as Error).message}`,
      );
    }
  }

  private async invalidateLists(): Promise<void> {
    try {
      // INCR atómico: si no existe, la inicializa en 1.
      await this.redis.incr(LIST_VERSION_KEY);
    } catch (err) {
      this.logger.warn(`Failed invalidating lists: ${(err as Error).message}`);
    }
  }

  private hashParams(params?: {
    categoryId?: string;
    skip?: number;
    take?: number;
  }): string {
    const normalized = JSON.stringify({
      categoryId: params?.categoryId ?? null,
      skip: params?.skip ?? 0,
      take: params?.take ?? null,
    });
    return createHash("sha1").update(normalized).digest("hex").slice(0, 16);
  }
}
