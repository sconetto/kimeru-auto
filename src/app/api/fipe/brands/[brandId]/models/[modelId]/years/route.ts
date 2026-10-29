import { NextResponse } from "next/server";
import { cacheKeys } from "@/lib/fipe/cache";
import { fipeClient } from "@/lib/fipe/client";
import { cachedJson } from "@/lib/fipe/respond";

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

  return cachedJson(cacheKeys.fipeYears(brand, model), REFERENCE_TTL_SECONDS, () =>
    fipeClient.getYears(brand, model, "cars"),
  );
}
