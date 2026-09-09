import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fipeHistory, modelYears } from "@/lib/db/schema";

/**
 * FIPE price history tracking.
 *
 * On every price refresh, snapshot into fipe_history keyed by
 * (model_year_id, reference_month). Upserts so concurrent refreshes for the
 * same reference month update the price + timestamp instead of racing or
 * creating duplicates.
 */

/** Record a price snapshot for a model year (idempotent upsert). */
export async function recordPriceSnapshot(
  modelYearId: number,
  price: string | number,
  referenceMonth: string,
): Promise<void> {
  await db
    .insert(fipeHistory)
    .values({
      modelYearId,
      referenceMonth,
      price: String(price),
    })
    .onConflictDoUpdate({
      target: [fipeHistory.modelYearId, fipeHistory.referenceMonth],
      set: { price: String(price), recordedAt: new Date() },
    });
}

/** Refresh a model year's stored FIPE price + snapshot history. */
export async function updateModelYearPrice(
  modelYearId: number,
  price: number,
  referenceMonth: string,
): Promise<void> {
  await db
    .update(modelYears)
    .set({ priceFipe: String(price), priceUpdatedAt: new Date() })
    .where(eq(modelYears.id, modelYearId));

  await recordPriceSnapshot(modelYearId, price, referenceMonth);
}

/** Fetch price history for a model year, oldest first. */
export async function getPriceHistory(modelYearId: number) {
  return db
    .select({
      referenceMonth: fipeHistory.referenceMonth,
      price: fipeHistory.price,
      recordedAt: fipeHistory.recordedAt,
    })
    .from(fipeHistory)
    .where(eq(fipeHistory.modelYearId, modelYearId))
    .orderBy(fipeHistory.recordedAt);
}

/** Compute 12-month depreciation % from stored history. */
export async function getDepreciation12m(modelYearId: number): Promise<number | null> {
  const history = await getPriceHistory(modelYearId);
  if (history.length < 2) return null;

  const latest = Number(history[history.length - 1].price);
  const earliest = Number(history[0].price);
  if (!latest || !earliest || earliest === 0) return null;

  return ((latest - earliest) / earliest) * 100;
}
