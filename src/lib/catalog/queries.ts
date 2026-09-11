import { and, asc, count, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
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
  modelVersions,
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
  brandLogoUrl: string | null;
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
  brandLogoUrl: string | null;
  modelId: number;
  modelName: string;
  modelSlug: string;
  category: (typeof vehicleCategory.enumValues)[number] | null;
  year: number;
  fuelType: (typeof fuelType.enumValues)[number];
  isZeroKm: boolean;
  priceFipe: string | null;
  priceUpdatedAt: Date | null;
  createdAt: Date | null;
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
    updatedAt: Date | null;
  } | null;
  sales: {
    modelId: number;
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
async function getBrandsWithCountsImpl(): Promise<BrandWithCount[]> {
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
    .orderBy(desc(sql`CASE WHEN ${count(models.id)} > 0 THEN 1 ELSE 0 END`), asc(brands.name));

  return rows.map((r) => ({ ...r, modelCount: Number(r.modelCount) }));
}

/** Cached brands-with-counts (Data Cache, 1h). Tagged for admin invalidation. */
export const getBrandsWithCounts = unstable_cache(getBrandsWithCountsImpl, ["brands-with-counts"], {
  revalidate: 3600,
  tags: ["catalog"],
});

/** A single brand by slug, regardless of whether it has models yet. */
async function getBrandBySlugImpl(slug: string): Promise<BrandWithCount | null> {
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
    .where(eq(brands.slug, slug))
    .groupBy(brands.id)
    .limit(1);

  const row = rows[0];
  return row ? { ...row, modelCount: Number(row.modelCount) } : null;
}

/** Cached brand-by-slug (Data Cache, 1h). Tagged for admin invalidation. */
export const getBrandBySlug = unstable_cache(getBrandBySlugImpl, ["brand-by-slug"], {
  revalidate: 3600,
  tags: ["catalog"],
});

/** Models for a brand, grouped by category, with latest price + sales. */
async function getModelsByBrandImpl(brandSlug: string): Promise<ModelCard[]> {
  const rows = await db
    .select({
      id: models.id,
      brandId: brands.id,
      brandName: brands.name,
      brandSlug: brands.slug,
      brandLogoUrl: brands.logoUrl,
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
      sql`${modelYears.id} = (
        SELECT my2.id
        FROM model_versions mv2
        JOIN model_years my2 ON my2.model_version_id = mv2.id
        WHERE mv2.model_id = ${models.id} AND mv2.is_active = true
        ORDER BY my2.is_zero_km DESC, my2.price_fipe ASC NULLS LAST, my2.year DESC
        LIMIT 1
      )`,
    )
    .leftJoin(
      salesRankings,
      sql`${salesRankings.modelId} = ${models.id} AND ${salesRankings.year} = (
        SELECT MAX(s2.year) FROM sales_rankings s2 WHERE s2.model_id = ${models.id}
      )`,
    )
    .where(and(eq(brands.slug, brandSlug), eq(models.isActive, true)))
    .orderBy(sql`${salesRankings.unitsSold} DESC NULLS LAST`);

  return rows.map((r) => ({
    id: r.id,
    brandId: r.brandId,
    brandName: r.brandName,
    brandSlug: r.brandSlug,
    brandLogoUrl: r.brandLogoUrl,
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

/** Cached models-by-brand (Data Cache, 1h). Tagged for admin invalidation. */
export const getModelsByBrand = unstable_cache(getModelsByBrandImpl, ["models-by-brand"], {
  revalidate: 3600,
  tags: ["catalog"],
});

/** Grouped specs for a model year, filtered to the specs applicable to its fuel type. */
async function getGroupedSpecs(
  modelYearId: number,
  fuel: (typeof fuelType.enumValues)[number],
): Promise<SpecGrouped[]> {
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
      applicableFuelTypes: specCategories.applicableFuelTypes,
    })
    .from(specValues)
    .innerJoin(specCategories, eq(specCategories.id, specValues.specCategoryId))
    .where(eq(specValues.modelYearId, modelYearId))
    .orderBy(asc(specCategories.displayOrder));

  const grouped = new Map<(typeof specGroup.enumValues)[number], SpecGrouped>();
  for (const row of rows) {
    const applicable = row.applicableFuelTypes;
    if (applicable != null && !applicable.includes(fuel)) continue;
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
async function getCarDetailImpl(
  modelSlug: string,
  locale: (typeof editorialLocale.enumValues)[number] = "pt-BR",
): Promise<CarDetail | null> {
  const [model] = await db
    .select({
      id: models.id,
      brandId: models.brandId,
      brandName: brands.name,
      brandSlug: brands.slug,
      brandLogoUrl: brands.logoUrl,
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

  // Latest model year across the family's active versions (0km preferred)
  const [my] = await db
    .select(getTableColumns(modelYears))
    .from(modelYears)
    .innerJoin(modelVersions, eq(modelVersions.id, modelYears.modelVersionId))
    .where(and(eq(modelVersions.modelId, model.id), eq(modelVersions.isActive, true)))
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
      createdAt: null,
      fipeCode: null,
      specs: [] as SpecGrouped[],
      editorial: null,
      sales: null,
      depreciation12m: null,
      priceHistory: [],
    };
  }

  const [specs, edRows, salesRows] = await Promise.all([
    getGroupedSpecs(my.id, my.fuelType),
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
        modelId: salesRankings.modelId,
        rankingPosition: salesRankings.rankingPosition,
        unitsSold: salesRankings.unitsSold,
        month: salesRankings.month,
        year: salesRankings.year,
      })
      .from(salesRankings)
      .where(eq(salesRankings.modelId, model.id))
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
    createdAt: my.createdAt,
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
          updatedAt: editorialResult.updatedAt,
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

/** Cached car detail (Data Cache, 1h). Tagged so admin edits invalidate it. */
export const getCarDetail = unstable_cache(getCarDetailImpl, ["car-detail"], {
  revalidate: 3600,
  tags: ["catalog"],
});

/** All active models across brands (for search + category pages). */
async function getAllActiveModelsImpl(): Promise<ModelCard[]> {
  const rows = await db
    .select({
      id: models.id,
      brandId: brands.id,
      brandName: brands.name,
      brandSlug: brands.slug,
      brandLogoUrl: brands.logoUrl,
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
      sql`${modelYears.id} = (
        SELECT my2.id
        FROM model_versions mv2
        JOIN model_years my2 ON my2.model_version_id = mv2.id
        WHERE mv2.model_id = ${models.id} AND mv2.is_active = true
        ORDER BY my2.is_zero_km DESC, my2.price_fipe ASC NULLS LAST, my2.year DESC
        LIMIT 1
      )`,
    )
    .leftJoin(
      salesRankings,
      sql`${salesRankings.modelId} = ${models.id} AND ${salesRankings.year} = (
        SELECT MAX(s2.year) FROM sales_rankings s2 WHERE s2.model_id = ${models.id}
      )`,
    )
    .where(eq(models.isActive, true))
    .orderBy(sql`${salesRankings.unitsSold} DESC NULLS LAST`);

  return rows.map((r) => ({
    id: r.id,
    brandId: r.brandId,
    brandName: r.brandName,
    brandSlug: r.brandSlug,
    brandLogoUrl: r.brandLogoUrl,
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

/** Cached active models (Data Cache, 1h). Tagged for admin invalidation. */
export const getAllActiveModels = unstable_cache(getAllActiveModelsImpl, ["active-models"], {
  revalidate: 3600,
  tags: ["catalog"],
});

/* ------------------------------------------------------------------ */
/* Comparison data                                                     */
/* ------------------------------------------------------------------ */

export interface CompareCar {
  modelYearId: number;
  slug: string;
  brandName: string;
  brandLogoUrl: string | null;
  modelName: string;
  versionName: string;
  versionSlug: string;
  year: number;
  fuelType: (typeof fuelType.enumValues)[number];
  isZeroKm: boolean;
  priceFipe: string | null;
  priceUpdatedAt: Date | null;
  createdAt: Date | null;
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
  editorialUpdatedAt: Date | null;
}

/** Fetch full comparison data for a list of modelYearIds (max 3). */
export async function getCompareCars(modelYearIds: number[]): Promise<CompareCar[]> {
  if (modelYearIds.length === 0) return [];

  const result: CompareCar[] = [];

  for (const modelYearId of modelYearIds.slice(0, 3)) {
    const [my] = await db
      .select({
        ...getTableColumns(modelYears),
        modelId: models.id,
        versionName: modelVersions.name,
        versionSlug: modelVersions.slug,
        modelSlug: models.slug,
        modelName: models.name,
        brandName: brands.name,
        brandLogoUrl: brands.logoUrl,
        category: models.category,
        sizeCategory: models.sizeCategory,
      })
      .from(modelYears)
      .innerJoin(modelVersions, eq(modelVersions.id, modelYears.modelVersionId))
      .innerJoin(models, eq(models.id, modelVersions.modelId))
      .innerJoin(brands, eq(brands.id, models.brandId))
      .where(and(eq(modelYears.id, modelYearId), eq(models.isActive, true)))
      .limit(1);

    if (!my) continue;

    const [specs, salesRows, editorialRow] = await Promise.all([
      getGroupedSpecs(my.id, my.fuelType),
      db
        .select({
          rankingPosition: salesRankings.rankingPosition,
          unitsSold: salesRankings.unitsSold,
          month: salesRankings.month,
          year: salesRankings.year,
        })
        .from(salesRankings)
        .where(eq(salesRankings.modelId, my.modelId))
        .orderBy(desc(salesRankings.year), desc(salesRankings.month))
        .limit(1),
      db
        .select({ rating: editorial.rating, updatedAt: editorial.updatedAt })
        .from(editorial)
        .where(and(eq(editorial.modelYearId, my.id), eq(editorial.published, true)))
        .limit(1),
    ]);

    result.push({
      modelYearId: my.id,
      slug: my.modelSlug,
      brandName: my.brandName,
      brandLogoUrl: my.brandLogoUrl,
      modelName: my.modelName,
      versionName: my.versionName,
      versionSlug: my.versionSlug,
      year: my.year,
      fuelType: my.fuelType,
      isZeroKm: my.isZeroKm,
      priceFipe: my.priceFipe,
      priceUpdatedAt: my.priceUpdatedAt,
      createdAt: my.createdAt,
      category: my.category,
      sizeCategory: my.sizeCategory,
      specs,
      sales: salesRows[0] ?? null,
      editorialRating: editorialRow[0]?.rating ?? null,
      editorialUpdatedAt: editorialRow[0]?.updatedAt ?? null,
    });
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* Compare options (cascade tree for the version-aware selector)       */
/* ------------------------------------------------------------------ */

export interface CompareOptionYear {
  id: number;
  year: number;
  fuelType: (typeof fuelType.enumValues)[number];
  isZeroKm: boolean;
}

export interface CompareOptionVersion {
  id: number;
  name: string;
  slug: string;
  years: CompareOptionYear[];
}

export interface CompareOptionModel {
  id: number;
  name: string;
  slug: string;
  versions: CompareOptionVersion[];
}

export interface CompareOptionBrand {
  id: number;
  name: string;
  slug: string;
  models: CompareOptionModel[];
}

/**
 * Brand → model → version → year·fuel·0km tree for the comparison selector.
 * Only model-years that have at least one spec value are included, so every
 * offered car is actually comparable.
 */
async function getCompareOptionsImpl(): Promise<CompareOptionBrand[]> {
  const rows = await db
    .select({
      brandId: brands.id,
      brandName: brands.name,
      brandSlug: brands.slug,
      modelId: models.id,
      modelName: models.name,
      modelSlug: models.slug,
      versionId: modelVersions.id,
      versionName: modelVersions.name,
      versionSlug: modelVersions.slug,
      yearId: modelYears.id,
      year: modelYears.year,
      fuelType: modelYears.fuelType,
      isZeroKm: modelYears.isZeroKm,
    })
    .from(modelYears)
    .innerJoin(modelVersions, eq(modelVersions.id, modelYears.modelVersionId))
    .innerJoin(models, eq(models.id, modelVersions.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .where(
      and(
        eq(models.isActive, true),
        sql`exists (select 1 from spec_values sv where sv.model_year_id = ${modelYears.id})`,
      ),
    )
    .orderBy(asc(brands.name), asc(models.name), asc(modelVersions.name), desc(modelYears.year));

  const brandsMap = new Map<number, CompareOptionBrand>();
  for (const r of rows) {
    let brand = brandsMap.get(r.brandId);
    if (!brand) {
      brand = { id: r.brandId, name: r.brandName, slug: r.brandSlug, models: [] };
      brandsMap.set(r.brandId, brand);
    }
    let model = brand.models.find((m) => m.id === r.modelId);
    if (!model) {
      model = { id: r.modelId, name: r.modelName, slug: r.modelSlug, versions: [] };
      brand.models.push(model);
    }
    let version = model.versions.find((v) => v.id === r.versionId);
    if (!version) {
      version = { id: r.versionId, name: r.versionName, slug: r.versionSlug, years: [] };
      model.versions.push(version);
    }
    version.years.push({ id: r.yearId, year: r.year, fuelType: r.fuelType, isZeroKm: r.isZeroKm });
  }

  return [...brandsMap.values()];
}

/** Cached compare-options tree (Data Cache, 1h). Tagged for admin invalidation. */
export const getCompareOptions = unstable_cache(getCompareOptionsImpl, ["compare-options"], {
  revalidate: 3600,
  tags: ["catalog"],
});

export interface SalesRankingRow {
  modelId: number;
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
async function getSalesRankingsImpl(): Promise<SalesRankingRow[]> {
  const [latest] = await db
    .select({ year: salesRankings.year, month: salesRankings.month })
    .from(salesRankings)
    .orderBy(desc(salesRankings.year), desc(salesRankings.month))
    .limit(1);

  if (!latest) return [];

  const rows = await db
    .select({
      modelId: salesRankings.modelId,
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
    .innerJoin(models, eq(models.id, salesRankings.modelId))
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

/** Cached top-50 sales rankings (Data Cache, 1h). Tagged for sync invalidation. */
export const getSalesRankings = unstable_cache(getSalesRankingsImpl, ["sales-rankings"], {
  revalidate: 3600,
  tags: ["sales"],
});

/** Monthly sales series for a model family (sparkline data). */
export async function getSalesTrend(
  modelId: number,
): Promise<{ month: number; year: number; unitsSold: number }[]> {
  const rows = await db
    .select({
      month: salesRankings.month,
      year: salesRankings.year,
      unitsSold: salesRankings.unitsSold,
    })
    .from(salesRankings)
    .where(eq(salesRankings.modelId, modelId))
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
    .innerJoin(modelVersions, eq(modelVersions.id, modelYears.modelVersionId))
    .innerJoin(models, eq(models.id, modelVersions.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .where(eq(editorial.published, true))
    .orderBy(desc(editorial.updatedAt))
    .limit(200);

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
