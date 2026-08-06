import { Redis } from "@upstash/redis";

/**
 * Redis client for caching FIPE prices and other hot data.
 *
 * Degrades gracefully: if UPSTASH_REDIS_REST_URL is not configured
 * (e.g., local dev without Redis), calls fall back to an in-memory
 * Map with the same interface, so the app never crashes without Redis.
 */

const hasRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

class MemoryFallback {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<"OK"> {
    this.store.set(key, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + (opts?.ex ?? 3600) * 1000,
    });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async exists(...keys: string[]): Promise<number> {
    return keys.filter((key) => {
      const entry = this.store.get(key);
      return entry && entry.expiresAt >= Date.now();
    }).length;
  }
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const cache: Redis | MemoryFallback =
  hasRedis && redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : new MemoryFallback();

/** Whether the cache is backed by real Redis (vs. in-memory fallback). */
export const isPersistentCache = hasRedis;

export const cacheKeys = {
  fipePrice: (fipeCode: string, yearId: string) => `fipe:price:${fipeCode}:${yearId}`,
  fipeBrands: "fipe:brands",
  fipeModels: (brandId: number) => `fipe:models:${brandId}`,
  fipeYears: (brandId: number, modelId: number) => `fipe:years:${brandId}:${modelId}`,
  fipeNegative: (fipeCode: string, yearId: string) => `fipe:negative:${fipeCode}:${yearId}`,
  page: (path: string, locale: string) => `page:${locale}:${path}`,
} as const;
