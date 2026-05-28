import { Logger } from "@nestjs/common";
import Redis from "ioredis";
import { applyJitter } from "./jitter";
import { acquireLock, releaseLock } from "./lock";

const logger = new Logger("CacheSWR");

type CacheEntry<T> = {
  data: T;
  storedAt: number; // epoch ms
};

export type SwrOptions<T> = {
  redis: Redis;
  key: string;
  freshTtlSeconds: number;
  hardTtlSeconds: number;
  fetcher: () => Promise<T>;
  lockTtlMs?: number;
};

export async function getWithSwr<T>(opts: SwrOptions<T>): Promise<T> {
  // Lectura: si Redis falla, degrada al source. Cache nunca es un SPOF.
  let raw: string | null = null;
  try {
    raw = await opts.redis.get(opts.key);
  } catch (err) {
    logger.warn(
      `Cache read failed for ${opts.key}, falling through: ${(err as Error).message}`,
    );
    return opts.fetcher();
  }

  if (raw) {
    const entry = JSON.parse(raw) as CacheEntry<T>;
    const ageSeconds = (Date.now() - entry.storedAt) / 1000;

    if (ageSeconds < opts.freshTtlSeconds) {
      return entry.data; // FRESH
    }

    // STALE: devolvé el valor viejo ya mismo y refrescá en background
    void backgroundRefresh(opts);
    return entry.data;
  }

  // MISS: nadie tiene este valor todavía
  return fetchWithLock(opts);
}

async function fetchWithLock<T>(opts: SwrOptions<T>): Promise<T> {
  const lockKey = `lock:${opts.key}`;
  const ttlMs = opts.lockTtlMs ?? 10_000;

  const lock = await acquireLock(opts.redis, lockKey, ttlMs);

  if (lock) {
    try {
      const data = await opts.fetcher();
      await writeCache(opts, data);
      return data;
    } finally {
      await releaseLock(opts.redis, lock);
    }
  }

  // Otro proceso tiene el lock. Esperá brevemente, probá el cache otra vez.
  await sleep(50);
  const raw = await opts.redis.get(opts.key).catch(() => null);
  if (raw) {
    return (JSON.parse(raw) as CacheEntry<T>).data;
  }

  // El otro lock holder fue lento o falló. Resolvé directo sin escribir
  // cache (no chocamos con el que sí tiene el lock).
  return opts.fetcher();
}

async function backgroundRefresh<T>(opts: SwrOptions<T>): Promise<void> {
  const lockKey = `lock:${opts.key}`;
  const ttlMs = opts.lockTtlMs ?? 10_000;

  const lock = await acquireLock(opts.redis, lockKey, ttlMs);
  if (!lock) return; // alguien más ya está refrescando

  try {
    const data = await opts.fetcher();
    await writeCache(opts, data);
  } catch (err) {
    logger.warn(
      `Background refresh failed for ${opts.key}: ${(err as Error).message}`,
    );
  } finally {
    await releaseLock(opts.redis, lock);
  }
}

async function writeCache<T>(opts: SwrOptions<T>, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, storedAt: Date.now() };
  const ttl = applyJitter(opts.hardTtlSeconds);
  try {
    await opts.redis.set(opts.key, JSON.stringify(entry), "EX", ttl);
  } catch (err) {
    logger.warn(
      `Cache write failed for ${opts.key}: ${(err as Error).message}`,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
