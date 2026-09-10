import { NextResponse } from "next/server";
import { cache } from "@/lib/fipe/cache";
import { parseFipePrice } from "@/lib/fipe/client";
import { clientIp, createRateLimiter } from "@/lib/ratelimit";

const BASE_URL = process.env.FIPE_API_BASE_URL ?? "https://fipe.parallelum.com.br/api/v2";
const API_TOKEN = process.env.FIPE_API_TOKEN;

// Aggregate TTL aligned to the DB freshness window (30 days): the first lookup
// pays one upstream call per model-year, subsequent visitors read the cache.
const AGGREGATE_TTL_SECONDS = 30 * 24 * 60 * 60;

// This route fans out one upstream FIPE call per model year, so cap per-IP
// traffic to protect the shared upstream quota (500 req/day without token).
const priceLimiter = createRateLimiter({ limit: 30, windowSeconds: 60 });

interface FipeYearRaw {
  code: string;
  name: string;
}

interface FipePriceRaw {
  price: string;
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  codeFipe: string;
  referenceMonth: string;
  vehicleType: number;
  fuelAcronym: string;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_TOKEN) headers["X-Subscription-Token"] = API_TOKEN;
  return headers;
}

export async function GET(request: Request) {
  const rl = await priceLimiter(`all-prices:${clientIp(request)}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.reset / 1000)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const modelId = searchParams.get("modelId");

  if (!brandId || !modelId) {
    return NextResponse.json({ error: "brandId and modelId are required" }, { status: 400 });
  }

  const cacheKey = `fipe:all-prices:${brandId}:${modelId}`;

  // Durable cache: serve the aggregate when fresh (30-day TTL).
  const cachedAggregate = await cache.get<{ prices: unknown[] }>(cacheKey);
  if (cachedAggregate?.prices) {
    return NextResponse.json(cachedAggregate, {
      headers: { "X-Cache": "HIT" },
    });
  }

  const base = `${BASE_URL}/cars/brands/${brandId}/models/${modelId}`;

  try {
    // Fetch all years
    const yearsRes = await fetch(`${base}/years`, { headers: authHeaders() });
    if (!yearsRes.ok) {
      return NextResponse.json({ error: "Failed to fetch years from FIPE" }, { status: 502 });
    }
    const years: FipeYearRaw[] = await yearsRes.json();

    // Fetch all prices in parallel (server-side — only 1 browser-to-server call)
    const prices = await Promise.all(
      years.map(async (y) => {
        try {
          const res = await fetch(`${base}/years/${y.code}`, { headers: authHeaders() });
          if (!res.ok) return null;
          const raw: FipePriceRaw = await res.json();
          return {
            yearCode: y.code,
            modelYear: raw.modelYear,
            fuel: raw.fuel,
            price: parseFipePrice(raw.price),
            isZeroKm: y.code.startsWith("32000"),
            referenceMonth: raw.referenceMonth,
            fipeCode: raw.codeFipe,
          };
        } catch {
          return null;
        }
      }),
    );

    const valid = prices.filter(Boolean);
    const body = { prices: valid };

    // Persist the aggregate so subsequent lookups never touch FIPE within the window.
    await cache.set(cacheKey, body, { ex: AGGREGATE_TTL_SECONDS });

    return NextResponse.json(body, { headers: { "X-Cache": "MISS" } });
  } catch {
    return NextResponse.json({ error: "FIPE API unavailable" }, { status: 502 });
  }
}
