import { NextResponse } from "next/server";
import { cache, cacheKeys } from "@/lib/fipe/cache";
import { type FipeModel, fipeClient } from "@/lib/fipe/client";
import { fipeErrorResponse } from "@/lib/fipe/respond";

export const dynamic = "force-dynamic";

const REFERENCE_TTL_SECONDS = 7 * 24 * 60 * 60;

interface RouteContext {
  params: Promise<{ brandId: string }>;
}

/**
 * GET /api/fipe/brands/[brandId]/models
 * Same-origin proxy for a brand's FIPE models (client-side lookups).
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { brandId } = await params;
  const brand = Number.parseInt(brandId, 10);
  if (Number.isNaN(brand)) {
    return NextResponse.json({ error: "Invalid brandId" }, { status: 400 });
  }

  const key = cacheKeys.fipeModels(brand);
  const cached = await cache.get<FipeModel[]>(key);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const models = await fipeClient.getModels(brand, "cars");
    await cache.set(key, models, { ex: REFERENCE_TTL_SECONDS });
    return NextResponse.json(models, { headers: { "X-Cache": "MISS" } });
  } catch (err) {
    return fipeErrorResponse(err);
  }
}
