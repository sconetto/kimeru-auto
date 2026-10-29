import { NextResponse } from "next/server";
import { cache, cacheKeys } from "@/lib/fipe/cache";
import { type FipeYear, fipeClient } from "@/lib/fipe/client";
import { fipeErrorResponse } from "@/lib/fipe/respond";

export const dynamic = "force-dynamic";

// New model years appear monthly, so a day of cache is plenty here.
const REFERENCE_TTL_SECONDS = 24 * 60 * 60;

interface RouteContext {
  params: Promise<{ brandId: string; modelId: string }>;
}

/**
 * GET /api/fipe/brands/[brandId]/models/[modelId]/years
 * Same-origin proxy for a model's FIPE years (client-side lookups).
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { brandId, modelId } = await params;
  const brand = Number.parseInt(brandId, 10);
  const model = Number.parseInt(modelId, 10);
  if (Number.isNaN(brand) || Number.isNaN(model)) {
    return NextResponse.json({ error: "Invalid brandId or modelId" }, { status: 400 });
  }

  const key = cacheKeys.fipeYears(brand, model);
  const cached = await cache.get<FipeYear[]>(key);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const years = await fipeClient.getYears(brand, model, "cars");
    await cache.set(key, years, { ex: REFERENCE_TTL_SECONDS });
    return NextResponse.json(years, { headers: { "X-Cache": "MISS" } });
  } catch (err) {
    return fipeErrorResponse(err);
  }
}
