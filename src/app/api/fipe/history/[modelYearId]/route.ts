import { NextResponse } from "next/server";
import { getDepreciation12m, getPriceHistory } from "@/lib/fipe/history";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ modelYearId: string }>;
}

/**
 * GET /api/fipe/history/[modelYearId]
 * Price history + depreciation for a model year.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { modelYearId } = await params;
  const id = Number.parseInt(modelYearId, 10);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid modelYearId" }, { status: 400 });
  }

  const [history, depreciation12m] = await Promise.all([
    getPriceHistory(id),
    getDepreciation12m(id),
  ]);

  return NextResponse.json({
    history: history.map((h) => ({
      referenceMonth: h.referenceMonth,
      price: Number(h.price),
      recordedAt: h.recordedAt,
    })),
    depreciation12m,
  });
}
