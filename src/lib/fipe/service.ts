import { cache, cacheKeys } from "./cache";
import { FipeApiError, type FipePriceParsed, fipeClient } from "./client";

/**
 * FIPE service — cache-first access with rate-limit protection.
 *
 * Strategy:
 *  1. Check Redis cache (1h TTL for prices)
 *  2. On miss, call the FIPE API
 *  3. Cache negative results (404s) for 24h to avoid hammering the API
 *  4. Rate-limit tracking with a simple in-memory counter; when the
 *     daily budget is 90% consumed, serve stale cache only.
 */

const CACHE_TTL_SECONDS = 3600; // 1h
const NEGATIVE_TTL_SECONDS = 86_400; // 24h

// Daily budget guard — 500 free req/day; be conservative and stop at 450.
const DAILY_BUDGET = 450;
const RATE_LIMIT_KEY = "fipe:rate:count";
const RATE_LIMIT_DAY_KEY = "fipe:rate:day";

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function trackRequest(): Promise<boolean> {
  const today = todayString();
  const day = await cache.get<string>(RATE_LIMIT_DAY_KEY);
  if (day !== today) {
    await cache.set(RATE_LIMIT_DAY_KEY, today, { ex: 86_400 });
    await cache.set(RATE_LIMIT_KEY, 0, { ex: 86_400 });
  }
  const count = (await cache.get<number>(RATE_LIMIT_KEY)) ?? 0;
  await cache.set(RATE_LIMIT_KEY, count + 1, { ex: 86_400 });
  return count < DAILY_BUDGET;
}

export interface PriceResult {
  price: FipePriceParsed;
  cached: boolean;
}

/** Fetch a FIPE price cache-first, with rate-limit + negative caching. */
export async function getFipePrice(
  brandId: number,
  modelId: number,
  yearId: string,
): Promise<PriceResult> {
  const negativeKey = cacheKeys.fipeNegative(String(modelId), yearId);

  // 1. Negative cache: known-missing combo → return null-ish error quickly
  const negative = await cache.get<boolean>(negativeKey);
  if (negative) {
    throw new FipeApiError("Vehicle not found in FIPE database", 404, "NOT_FOUND");
  }

  // 2. Positive cache
  const cacheKey = cacheKeys.fipePrice(String(modelId), yearId);
  const cached = await cache.get<FipePriceParsed>(cacheKey);
  if (cached) {
    return { price: cached, cached: true };
  }

  // 3. Rate limit guard — beyond budget, refuse fresh calls
  const withinBudget = await trackRequest();
  if (!withinBudget) {
    throw new FipeApiError("FIPE daily budget exhausted", 429, "RATE_LIMITED");
  }

  // 4. Fresh fetch
  try {
    const price = await fipeClient.getPrice(brandId, modelId, yearId);
    await cache.set(cacheKey, price, { ex: CACHE_TTL_SECONDS });
    return { price, cached: false };
  } catch (err) {
    if (err instanceof FipeApiError && err.code === "NOT_FOUND") {
      await cache.set(negativeKey, true, { ex: NEGATIVE_TTL_SECONDS });
    }
    throw err;
  }
}

/** Warm a single price into cache without surfacing 404s as failures. */
export async function warmFipePrice(
  brandId: number,
  modelId: number,
  yearId: string,
): Promise<FipePriceParsed | null> {
  try {
    const { price } = await getFipePrice(brandId, modelId, yearId);
    return price;
  } catch {
    return null;
  }
}
