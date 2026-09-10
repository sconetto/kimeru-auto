import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { modelYears } from "@/lib/db/schema";
import { cache, cacheKeys } from "./cache";
import { FipeApiError, type FipePriceParsed, fipeClient } from "./client";
import { DB_FRESHNESS_MS } from "./freshness";
import { updateModelYearPrice } from "./history";

/**
 * FIPE service — DB-first access with a Redis hot cache and rate-limit guard.
 *
 * Strategy:
 *  1. Check Redis cache (1h TTL for prices)
 *  2. On miss, check the database (`model_years`) by FIPE code when available:
 *     if the stored price is fresher than DB_FRESHNESS_DAYS (30), serve it and
 *     re-populate Redis without any upstream call.
 *  3. On DB miss/stale, call the FIPE API and persist to DB + Redis + history.
 *  4. Cache negative results (404s) for 24h to avoid hammering the API.
 *  5. Rate-limit tracking with a shared counter; when the daily budget is
 *     90% consumed, serve stale cache only.
 */

const CACHE_TTL_SECONDS = 3600; // 1h hot cache
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

/**
 * Look up a fresh DB price for a FIPE code. Returns the price + its model-year
 * id when the stored row is fresher than the DB freshness window, else null.
 */
async function getFreshDbPrice(
  fipeCode: string,
): Promise<{ price: number; referenceMonth: string; modelYearId: number } | null> {
  const [row] = await db
    .select({
      modelYearId: modelYears.id,
      priceFipe: modelYears.priceFipe,
      referenceMonth: modelYears.updatedAt,
    })
    .from(modelYears)
    .where(eq(modelYears.fipeCode, fipeCode))
    .limit(1);

  if (!row?.priceFipe) return null;
  const updatedAt = row.referenceMonth?.getTime?.() ?? 0;
  if (Date.now() - updatedAt > DB_FRESHNESS_MS) return null;

  return {
    price: Number(row.priceFipe),
    referenceMonth: new Date(updatedAt).toISOString().slice(0, 7),
    modelYearId: row.modelYearId,
  };
}

/**
 * Fetch a FIPE price DB-first (with a Redis hot cache), rate-limited.
 *
 * When `fipeCode` is known (e.g. the catalog already stored it on the model
 * year), a fresh DB row is served without any upstream call. When it is not
 * known, the request falls back to Redis → API and persists the result so the
 * DB becomes the source of truth for subsequent calls.
 */
export async function getFipePrice(
  brandId: number,
  modelId: number,
  yearId: string,
  fipeCode?: string,
): Promise<PriceResult> {
  const negativeKey = cacheKeys.fipeNegative(String(modelId), yearId);

  // 1. Negative cache: known-missing combo → return null-ish error quickly
  const negative = await cache.get<boolean>(negativeKey);
  if (negative) {
    throw new FipeApiError("Vehicle not found in FIPE database", 404, "NOT_FOUND");
  }

  // 2. Positive hot cache
  const cacheKey = cacheKeys.fipePrice(String(modelId), yearId);
  const cached = await cache.get<FipePriceParsed>(cacheKey);
  if (cached) {
    return { price: cached, cached: true };
  }

  // 3. DB-first: when the FIPE code is known, serve a fresh DB row without API.
  if (fipeCode) {
    const fresh = await getFreshDbPrice(fipeCode);
    if (fresh) {
      const dbPrice: FipePriceParsed = {
        price: fresh.price,
        brand: String(brandId),
        model: String(modelId),
        modelYear: 0,
        fuel: "",
        fipeCode,
        referenceMonth: fresh.referenceMonth,
        vehicleType: 1,
        isZeroKm: yearId.startsWith("32000"),
        yearCode: yearId,
      };
      await cache.set(cacheKey, dbPrice, { ex: CACHE_TTL_SECONDS });
      return { price: dbPrice, cached: true };
    }
  }

  // 4. Rate limit guard — beyond budget, refuse fresh calls
  const withinBudget = await trackRequest();
  if (!withinBudget) {
    throw new FipeApiError("FIPE daily budget exhausted", 429, "RATE_LIMITED");
  }

  // 5. Fresh fetch
  try {
    const price = await fipeClient.getPrice(brandId, modelId, yearId);
    await cache.set(cacheKey, price, { ex: CACHE_TTL_SECONDS });

    // Persist to DB (keyed by the FIPE code returned by the API) so the DB
    // becomes the source of truth and future calls skip the API.
    if (price.fipeCode) {
      const [row] = await db
        .select({ id: modelYears.id })
        .from(modelYears)
        .where(eq(modelYears.fipeCode, price.fipeCode))
        .limit(1);
      if (row) {
        await updateModelYearPrice(row.id, price.price, price.referenceMonth);
      }
    }

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
  fipeCode?: string,
): Promise<FipePriceParsed | null> {
  try {
    const { price } = await getFipePrice(brandId, modelId, yearId, fipeCode);
    return price;
  } catch {
    return null;
  }
}

/** Whether a model-year row is fresh enough that the FIPE sync can skip it. */
export { isDbPriceFresh } from "./freshness";
