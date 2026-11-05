import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, models, salesRankings } from "@/lib/db/schema";

/**
 * Placeholder models created by the FENABRAVE sync for names that matched no
 * catalog model. They are inactive (hidden publicly) but own real sales rows,
 * so they must be enriched rather than deleted.
 */
export interface EnrichmentQueueRow {
  modelId: number;
  modelName: string;
  modelSlug: string;
  brandName: string;
  brandSlug: string;
  monthsWithSales: number;
  totalUnits: number;
}

export async function getEnrichmentQueue(): Promise<EnrichmentQueueRow[]> {
  return db
    .select({
      modelId: models.id,
      modelName: models.name,
      modelSlug: models.slug,
      brandName: brands.name,
      brandSlug: brands.slug,
      monthsWithSales: sql<number>`count(${salesRankings.id})::int`,
      totalUnits: sql<number>`coalesce(sum(${salesRankings.unitsSold}), 0)::int`,
    })
    .from(models)
    .innerJoin(brands, eq(brands.id, models.brandId))
    .leftJoin(salesRankings, eq(salesRankings.modelId, models.id))
    .where(eq(models.needsEnrichment, true))
    .groupBy(models.id, models.name, models.slug, brands.name, brands.slug)
    .orderBy(desc(sql`coalesce(sum(${salesRankings.unitsSold}), 0)`));
}
