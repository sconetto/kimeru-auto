import { Redis } from "@upstash/redis";

/**
 * Redis client for caching FIPE prices and other hot data.
 *
 * Reads the Vercel KV env vars (KV_REST_API_URL / KV_REST_API_TOKEN) with the
 * legacy UPSTASH_REDIS_REST_* names as a fallback (local dev). Degrades
 * gracefully: if neither is configured, calls fall back to an in-memory Map
 * with the same interface, so the app never crashes without Redis.
 */

const hasRedis = Boolean(
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
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

  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    const now = Date.now();
    if (!entry || entry.expiresAt < now) {
      this.store.set(key, { value: "1", expiresAt: now + 3600 * 1000 });
      return 1;
    }
    const next = Number(entry.value) + 1;
    this.store.set(key, { value: String(next), expiresAt: entry.expiresAt });
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    this.store.set(key, { value: entry.value, expiresAt: Date.now() + seconds * 1000 });
    return 1;
  }
}

const kvUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const cache: Redis | MemoryFallback =
  hasRedis && kvUrl && kvToken ? new Redis({ url: kvUrl, token: kvToken }) : new MemoryFallback();

/** Whether the cache is backed by real Redis (vs. in-memory fallback). */
export const isPersistentCache = hasRedis;

export const cacheKeys = {
  fipePrice: (fipeCode: string, yearId: string) => `fipe:price:${fipeCode}:${yearId}`,
  fipeBrands: "fipe:brands",
  fipeModels: (brandId: number) => `fipe:models:${brandId}`,
  fipeYears: (brandId: number, modelId: number) => `fipe:years:${brandId}:${modelId}`,
  fipeNegative: (fipeCode: string, yearId: string) => `fipe:negative:${fipeCode}:${yearId}`,
} as const;
