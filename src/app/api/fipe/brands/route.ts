import { NextResponse } from "next/server";
import { cache, cacheKeys } from "@/lib/fipe/cache";
import { type FipeBrand, fipeClient } from "@/lib/fipe/client";
import { fipeErrorResponse } from "@/lib/fipe/respond";

export const dynamic = "force-dynamic";

// Brand/model/year reference data changes at most once a month, so cache it
// hard: the shared FIPE quota (500 req/day without a token) is then barely
// touched, and the browser never talks to fipe.parallelum.com.br directly.
const REFERENCE_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * GET /api/fipe/brands
 * Same-origin proxy for the FIPE brand list (client-side lookups).
 */
export async function GET() {
  const cached = await cache.get<FipeBrand[]>(cacheKeys.fipeBrands);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const brands = await fipeClient.getBrands("cars");
    await cache.set(cacheKeys.fipeBrands, brands, { ex: REFERENCE_TTL_SECONDS });
    return NextResponse.json(brands, { headers: { "X-Cache": "MISS" } });
  } catch (err) {
    return fipeErrorResponse(err);
  }
}
