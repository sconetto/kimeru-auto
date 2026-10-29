import { cacheKeys } from "@/lib/fipe/cache";
import { type FipeBrand, fipeClient } from "@/lib/fipe/client";
import { cachedJson } from "@/lib/fipe/respond";

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
  return cachedJson(cacheKeys.fipeBrands, REFERENCE_TTL_SECONDS, () =>
    fipeClient.getBrands("cars"),
  );
}
