import { NextResponse } from "next/server";
import { cacheKeys } from "@/lib/fipe/cache";
import { fipeClient } from "@/lib/fipe/client";
import { cachedJson } from "@/lib/fipe/respond";

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

  return cachedJson(cacheKeys.fipeModels(brand), REFERENCE_TTL_SECONDS, () =>
    fipeClient.getModels(brand, "cars"),
  );
}
