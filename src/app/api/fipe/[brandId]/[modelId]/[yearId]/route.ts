import { NextResponse } from "next/server";
import { FipeApiError } from "@/lib/fipe/client";
import { getFipePrice } from "@/lib/fipe/service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ brandId: string; modelId: string; yearId: string }>;
}

/**
 * GET /api/fipe/[brandId]/[modelId]/[yearId]
 * Fetch a FIPE price (cache-first). yearId supports "32000-1" style 0km codes.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { brandId, modelId, yearId } = await params;

  const brand = Number.parseInt(brandId, 10);
  const model = Number.parseInt(modelId, 10);

  if (Number.isNaN(brand) || Number.isNaN(model) || !yearId) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    const { price, cached } = await getFipePrice(brand, model, yearId);
    return NextResponse.json(
      { ...price, meta: { cached } },
      { headers: { "X-Cache": cached ? "HIT" : "MISS" } },
    );
  } catch (err) {
    if (err instanceof FipeApiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
