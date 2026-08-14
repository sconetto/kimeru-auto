import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type {
  EditorialScoreBreakdown,
  EditorialTranscript,
  editorialLocale,
  fuelType,
  specGroup,
  vehicleCategory,
} from "@/lib/db/schema";
import {
  brands,
  editorial,
  fipeHistory,
  models,
  modelYears,
  salesRankings,
  specCategories,
  specValues,
} from "@/lib/db/schema";
import { editorialTeaser } from "@/lib/editorial/teaser";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface BrandWithCount {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  originCountry: string | null;
  modelCount: number;
}

export interface ModelCard {
  id: number;
  brandId: number;
  brandName: string;
  brandSlug: string;
  name: string;
  slug: string;
  category: (typeof vehicleCategory.enumValues)[number] | null;
  imageUrl: string | null;
  priceFipe: string | null;
  year: number | null;
  fuelType: (typeof fuelType.enumValues)[number] | null;
  rankingPosition: number | null;
  unitsSold: number | null;
  salesMonth: number | null;
  salesYear: number | null;
}

export interface SpecGrouped {
  group: (typeof specGroup.enumValues)[number];
  label: string;
  specs: {
    categoryId: number;
    name: string;
    slug: string;
    unit: string | null;
    value: string | null;
    numericValue: string | null;
    displayValue: string | null;
    higherIsBetter: boolean;
    isNumeric: boolean;
  }[];
}

export interface CarDetail {
  id: number;
  brandId: number;
  brandName: string;
  brandSlug: string;
  modelId: number;
  modelName: string;
  modelSlug: string;
  category: (typeof vehicleCategory.enumValues)[number] | null;
  year: number;
  fuelType: (typeof fuelType.enumValues)[number];
  isZeroKm: boolean;
  priceFipe: string | null;
  priceUpdatedAt: Date | null;
  fipeCode: string | null;
  imageUrl: string | null;
  specs: SpecGrouped[];
  editorial: {
    pros: string[];
    cons: string[];
    summary: string | null;
    rating: string | null;
    scoreBreakdown: EditorialScoreBreakdown | null;
    transcripts: EditorialTranscript[];
    sourceVideos: { url: string; title?: string }[];
  } | null;
  sales: {
    modelYearId: number;
    rankingPosition: number | null;
    unitsSold: number | null;
    month: number | null;
    year: number | null;
  } | null;
  depreciation12m: number | null;
  priceHistory: { referenceMonth: string; price: number; recordedAt: Date }[];
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

/** All active brands with their model counts. */
export async function getBrandsWithCounts(): Promise<BrandWithCount[]> {
  const rows = await db
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      logoUrl: brands.logoUrl,
      originCountry: brands.originCountry,
      modelCount: count(models.id),
    })
    .from(brands)
    .leftJoin(models, and(eq(models.brandId, brands.id), eq(models.isActive, true)))
    .where(eq(brands.isActive, true))
    .groupBy(brands.id)
    .orderBy(asc(brands.name));

  return rows.map((r) => ({ ...r, modelCount: Number(r.modelCount) }));
}

/** Models for a brand, grouped by category, with latest price + sales. */
export async function getModelsByBrand(brandSlug: string): Promise<ModelCard[]> {
  const rows = await db
    .select({
      id: models.id,
      brandId: brands.id,
      brandName: brands.name,
      brandSlug: brands.slug,
      name: models.name,
      slug: models.slug,
      category: models.category,
      imageUrl: models.imageUrl,
      priceFipe: modelYears.priceFipe,
      year: modelYears.year,
      fuelType: modelYears.fuelType,
      rankingPosition: salesRankings.rankingPosition,
      unitsSold: salesRankings.unitsSold,
      salesMonth: salesRankings.month,
      salesYear: salesRankings.year,
    })
    .from(models)
    .innerJoin(brands, eq(brands.id, models.brandId))
    .leftJoin(
      modelYears,
      sql`${modelYears.modelId} = ${models.id} AND ${modelYears.priceUpdatedAt} = (
        SELECT MAX(m2.price_updated_at) FROM model_years m2 WHERE m2.model_id = ${models.id}
      )`,
    )
    .leftJoin(
      salesRankings,
      sql`${salesRankings.modelYearId} = ${modelYears.id} AND ${salesRankings.year} = (
        SELECT MAX(s2.year) FROM sales_rankings s2 WHERE s2.model_year_id = ${modelYears.id}
      )`,
    )
    .where(and(eq(brands.slug, brandSlug), eq(models.isActive, true)))
    .orderBy(sql`${salesRankings.unitsSold} DESC NULLS LAST`);

  return rows.map((r) => ({
    id: r.id,
    brandId: r.brandId,
    brandName: r.brandName,
    brandSlug: r.brandSlug,
    name: r.name,
    slug: r.slug,
    category: r.category,
    imageUrl: r.imageUrl,
    priceFipe: r.priceFipe,
    year: r.year,
    fuelType: r.fuelType,
    rankingPosition: r.rankingPosition,
    unitsSold: r.unitsSold,
    salesMonth: r.salesMonth,
    salesYear: r.salesYear,
  }));
}

/** Grouped specs for a model year. */
async function getGroupedSpecs(modelYearId: number): Promise<SpecGrouped[]> {
  const rows = await db
    .select({
      group: specCategories.group,
      categoryId: specCategories.id,
      name: specCategories.name,
      slug: specCategories.slug,
      unit: specCategories.unit,
      value: specValues.value,
      numericValue: specValues.numericValue,
      displayValue: specValues.displayValue,
      higherIsBetter: specCategories.higherIsBetter,
      isNumeric: specCategories.isNumeric,
      displayOrder: specCategories.displayOrder,
    })
    .from(specValues)
    .innerJoin(specCategories, eq(specCategories.id, specValues.specCategoryId))
    .where(eq(specValues.modelYearId, modelYearId))
    .orderBy(asc(specCategories.displayOrder));

  const grouped = new Map<(typeof specGroup.enumValues)[number], SpecGrouped>();
  for (const row of rows) {
    const entry = grouped.get(row.group) ?? {
      group: row.group,
      label: row.group,
      specs: [],
    };
    entry.specs.push({
      categoryId: row.categoryId,
      name: row.name,
      slug: row.slug,
      unit: row.unit,
      value: row.value,
      numericValue: row.numericValue,
      displayValue: row.displayValue,
      higherIsBetter: row.higherIsBetter,
      isNumeric: row.isNumeric,
    });
    grouped.set(row.group, entry);
  }
  return [...grouped.values()];
}

/** Full detail for a car detail page. locale-aware editorial with pt-BR fallback. */
export async function getCarDetail(
  modelSlug: string,
  locale: (typeof editorialLocale.enumValues)[number] = "pt-BR",
): Promise<CarDetail | null> {
  const [model] = await db
    .select({
      id: models.id,
      brandId: models.brandId,
      brandName: brands.name,
      brandSlug: brands.slug,
      modelId: models.id,
      modelName: models.name,
      modelSlug: models.slug,
      category: models.category,
      imageUrl: models.imageUrl,
    })
    .from(models)
    .innerJoin(brands, eq(brands.id, models.brandId))
    .where(and(eq(models.slug, modelSlug), eq(models.isActive, true)))
    .limit(1);

  if (!model) return null;

  // Latest model year (0km preferred)
  const [my] = await db
    .select()
    .from(modelYears)
    .where(eq(modelYears.modelId, model.id))
    .orderBy(desc(modelYears.isZeroKm), desc(modelYears.year))
    .limit(1);

  if (!my) {
    return {
      ...model,
      year: 0,
      fuelType: "flex" as (typeof fuelType.enumValues)[number],
      isZeroKm: false,
      priceFipe: null,
      priceUpdatedAt: null,
      fipeCode: null,
      specs: [] as SpecGrouped[],
      editorial: null,
      sales: null,
      depreciation12m: null,
      priceHistory: [],
    };
  }

  const [specs, edRows, salesRows] = await Promise.all([
    getGroupedSpecs(my.id),
    db
      .select()
      .from(editorial)
      .where(
        and(
          eq(editorial.modelYearId, my.id),
          eq(editorial.published, true),
          eq(editorial.locale, locale),
        ),
      )
      .limit(1),
    db
      .select({
        modelYearId: salesRankings.modelYearId,
        rankingPosition: salesRankings.rankingPosition,
        unitsSold: salesRankings.unitsSold,
        month: salesRankings.month,
        year: salesRankings.year,
      })
      .from(salesRankings)
      .where(eq(salesRankings.modelYearId, my.id))
      .orderBy(desc(salesRankings.year), desc(salesRankings.month))
      .limit(1),
  ]);

  const ed = edRows[0] ?? null;
  const sales = salesRows[0] ?? null;

  let editorialResult = ed;
  if (!editorialResult && locale !== "pt-BR") {
    const [fallback] = await db
      .select()
      .from(editorial)
      .where(
        and(
          eq(editorial.modelYearId, my.id),
          eq(editorial.published, true),
          eq(editorial.locale, "pt-BR"),
        ),
      )
      .limit(1);
    editorialResult = fallback ?? null;
  }

  // Depreciation from FIPE history
  const history = await db
    .select({
      referenceMonth: fipeHistory.referenceMonth,
      price: fipeHistory.price,
      recordedAt: fipeHistory.recordedAt,
    })
    .from(fipeHistory)
    .where(eq(fipeHistory.modelYearId, my.id))
    .orderBy(asc(fipeHistory.recordedAt));
  let depreciation12m: number | null = null;
  if (history.length >= 2) {
    const first = Number(history[0].price);
    const last = Number(history[history.length - 1].price);
    if (first && last) depreciation12m = ((last - first) / first) * 100;
  }

  return {
    ...model,
    year: my.year,
    fuelType: my.fuelType,
    isZeroKm: my.isZeroKm,
    priceFipe: my.priceFipe,
    priceUpdatedAt: my.priceUpdatedAt,
    fipeCode: my.fipeCode,
    specs,
    editorial: editorialResult
      ? {
          pros: editorialResult.pros,
          cons: editorialResult.cons,
          summary: editorialResult.summary,
          rating: editorialResult.rating,
          scoreBreakdown: editorialResult.scoreBreakdown,
          transcripts: editorialResult.transcripts,
          sourceVideos: editorialResult.sourceVideos,
        }
      : null,
    sales: sales ?? null,
    depreciation12m,
    priceHistory: history.map((h) => ({
      referenceMonth: h.referenceMonth,
      price: Number(h.price),
      recordedAt: h.recordedAt,
    })),
  };
}

/** All active models across brands (for search + category pages). */
export async function getAllActiveModels(): Promise<ModelCard[]> {
  const rows = await db
    .select({
      id: models.id,
      brandId: brands.id,
      brandName: brands.name,
      brandSlug: brands.slug,
      name: models.name,
      slug: models.slug,
      category: models.category,
      imageUrl: models.imageUrl,
      priceFipe: modelYears.priceFipe,
      year: modelYears.year,
      fuelType: modelYears.fuelType,
      rankingPosition: salesRankings.rankingPosition,
      unitsSold: salesRankings.unitsSold,
      salesMonth: salesRankings.month,
      salesYear: salesRankings.year,
    })
    .from(models)
    .innerJoin(brands, eq(brands.id, models.brandId))
    .leftJoin(
      modelYears,
      sql`${modelYears.modelId} = ${models.id} AND ${modelYears.priceUpdatedAt} = (
        SELECT MAX(m2.price_updated_at) FROM model_years m2 WHERE m2.model_id = ${models.id}
      )`,
    )
    .leftJoin(
      salesRankings,
      sql`${salesRankings.modelYearId} = ${modelYears.id} AND ${salesRankings.year} = (
        SELECT MAX(s2.year) FROM sales_rankings s2 WHERE s2.model_year_id = ${modelYears.id}
      )`,
    )
    .where(eq(models.isActive, true))
    .orderBy(sql`${salesRankings.unitsSold} DESC NULLS LAST`);

  return rows.map((r) => ({
    id: r.id,
    brandId: r.brandId,
    brandName: r.brandName,
    brandSlug: r.brandSlug,
    name: r.name,
    slug: r.slug,
    category: r.category,
    imageUrl: r.imageUrl,
    priceFipe: r.priceFipe,
    year: r.year,
    fuelType: r.fuelType,
    rankingPosition: r.rankingPosition,
    unitsSold: r.unitsSold,
    salesMonth: r.salesMonth,
    salesYear: r.salesYear,
  }));
}

/* ------------------------------------------------------------------ */
/* Comparison data                                                     */
/* ------------------------------------------------------------------ */

export interface CompareCar {
  slug: string;
  brandName: string;
  modelName: string;
  year: number;
  fuelType: (typeof fuelType.enumValues)[number];
  isZeroKm: boolean;
  priceFipe: string | null;
  category: string | null;
  sizeCategory: string | null;
  specs: SpecGrouped[];
  sales: {
    rankingPosition: number | null;
    unitsSold: number | null;
    month: number | null;
    year: number | null;
  } | null;
  editorialRating: string | null;
}

/** Fetch full comparison data for a list of model slugs (max 3). */
export async function getCompareCars(slugs: string[]): Promise<CompareCar[]> {
  if (slugs.length === 0) return [];

  const result: CompareCar[] = [];

  for (const slug of slugs.slice(0, 3)) {
    const [model] = await db
      .select({
        id: models.id,
        slug: models.slug,
        brandName: brands.name,
        modelName: models.name,
        category: models.category,
        sizeCategory: models.sizeCategory,
      })
      .from(models)
      .innerJoin(brands, eq(brands.id, models.brandId))
      .where(and(eq(models.slug, slug), eq(models.isActive, true)))
      .limit(1);

    if (!model) continue;

    const [my] = await db
      .select()
      .from(modelYears)
      .where(eq(modelYears.modelId, model.id))
      .orderBy(desc(modelYears.isZeroKm), desc(modelYears.year))
      .limit(1);

    if (!my) continue;

    const [specs, salesRows, editorialRow] = await Promise.all([
      getGroupedSpecs(my.id),
      db
        .select({
          rankingPosition: salesRankings.rankingPosition,
          unitsSold: salesRankings.unitsSold,
          month: salesRankings.month,
          year: salesRankings.year,
        })
        .from(salesRankings)
        .where(eq(salesRankings.modelYearId, my.id))
        .orderBy(desc(salesRankings.year), desc(salesRankings.month))
        .limit(1),
      db
        .select({ rating: editorial.rating })
        .from(editorial)
        .where(and(eq(editorial.modelYearId, my.id), eq(editorial.published, true)))
        .limit(1),
    ]);

    result.push({
      slug: model.slug,
      brandName: model.brandName,
      modelName: model.modelName,
      year: my.year,
      fuelType: my.fuelType,
      isZeroKm: my.isZeroKm,
      priceFipe: my.priceFipe,
      category: model.category,
      sizeCategory: model.sizeCategory,
      specs,
      sales: salesRows[0] ?? null,
      editorialRating: editorialRow[0]?.rating ?? null,
    });
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* Sales rankings (FENABRAVE)                                          */
/* ------------------------------------------------------------------ */

export interface SalesRankingRow {
  modelYearId: number;
  modelSlug: string;
  modelName: string;
  brandName: string;
  category: (typeof vehicleCategory.enumValues)[number] | null;
  unitsSold: number;
  rankingPosition: number;
  month: number;
  year: number;
}

/** Top-selling models for the latest month with data. */
export async function getSalesRankings(): Promise<SalesRankingRow[]> {
  const [latest] = await db
    .select({ year: salesRankings.year, month: salesRankings.month })
    .from(salesRankings)
    .orderBy(desc(salesRankings.year), desc(salesRankings.month))
    .limit(1);

  if (!latest) return [];

  const rows = await db
    .select({
      modelYearId: salesRankings.modelYearId,
      modelSlug: models.slug,
      modelName: models.name,
      brandName: brands.name,
      category: models.category,
      unitsSold: salesRankings.unitsSold,
      rankingPosition: salesRankings.rankingPosition,
      month: salesRankings.month,
      year: salesRankings.year,
    })
    .from(salesRankings)
    .innerJoin(modelYears, eq(modelYears.id, salesRankings.modelYearId))
    .innerJoin(models, eq(models.id, modelYears.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .where(and(eq(salesRankings.year, latest.year), eq(salesRankings.month, latest.month)))
    .orderBy(asc(salesRankings.rankingPosition))
    .limit(50);

  return rows.map((r) => ({
    ...r,
    unitsSold: Number(r.unitsSold),
    rankingPosition: Number(r.rankingPosition ?? 999),
  }));
}

/** Monthly sales series for a model year (sparkline data). */
export async function getSalesTrend(
  modelYearId: number,
): Promise<{ month: number; year: number; unitsSold: number }[]> {
  const rows = await db
    .select({
      month: salesRankings.month,
      year: salesRankings.year,
      unitsSold: salesRankings.unitsSold,
    })
    .from(salesRankings)
    .where(eq(salesRankings.modelYearId, modelYearId))
    .orderBy(asc(salesRankings.year), asc(salesRankings.month))
    .limit(12);
  return rows.map((r) => ({ ...r, unitsSold: Number(r.unitsSold) }));
}

/** A car with published editorial, for the review index list. */
export interface ReviewListItem {
  modelSlug: string;
  brandName: string;
  modelName: string;
  year: number;
  rating: string | null;
  summaryExcerpt: string | null;
  updatedAt: Date | null;
}

/** All cars with at least one published editorial (any locale), newest first. */
export async function getPublishedReviews(): Promise<ReviewListItem[]> {
  const rows = await db
    .select({
      modelYearId: modelYears.id,
      modelSlug: models.slug,
      brandName: brands.name,
      modelName: models.name,
      year: modelYears.year,
      rating: editorial.rating,
      summary: editorial.summary,
      updatedAt: editorial.updatedAt,
    })
    .from(editorial)
    .innerJoin(modelYears, eq(modelYears.id, editorial.modelYearId))
    .innerJoin(models, eq(models.id, modelYears.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .where(eq(editorial.published, true))
    .orderBy(desc(editorial.updatedAt));

  // Dedupe by model year: keep the first (pt-BR preferred, since it sorts
  // by updatedAt desc; when both locales exist, prefer the pt-BR row).
  const seen = new Set<number>();
  const result: ReviewListItem[] = [];
  for (const r of rows) {
    if (seen.has(r.modelYearId)) continue;
    seen.add(r.modelYearId);
    result.push({
      modelSlug: r.modelSlug,
      brandName: r.brandName,
      modelName: r.modelName,
      year: r.year,
      rating: r.rating,
      summaryExcerpt: editorialTeaser(r.summary),
      updatedAt: r.updatedAt,
    });
  }
  return result;
}
