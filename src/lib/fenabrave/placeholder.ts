import { eq } from "drizzle-orm";
import { slugify } from "@/lib/catalog/slug";
import { db } from "@/lib/db";
import { brands, models } from "@/lib/db/schema";
import { normalizeName as normalize, splitReportName, toDisplayName } from "./report-name";

/**
 * Placeholder models for FENABRAVE rows that match nothing in the catalog.
 *
 * `sales_rankings.model_id` is a non-null FK, so an unmatched row used to be
 * thrown away. Instead we create an inactive model flagged
 * `needs_enrichment` that owns the registrations until an admin fills in the
 * versions, price and specs. Inactive already means "hidden from the public
 * catalog"; the flag distinguishes "awaiting data" from "retired".
 */

/**
 * Brand tokens the report uses that differ from the catalog name. Extend as
 * new mismatches appear rather than letting near-duplicate brands accumulate.
 */
const BRAND_ALIASES: Record<string, string> = {
  VW: "Volkswagen",
  VOLKS: "Volkswagen",
  GM: "Chevrolet",
  "CAOA CHERY": "Chery",
  "CAOA HYUNDAI": "Hyundai",
  "GREAT WALL": "GWM",
  RAM: "RAM",
  JAC: "JAC",
};

export { splitReportName, toDisplayName };

export type PlaceholderResolution = {
  modelId: number;
  /** True when this call inserted a new placeholder model. */
  created: boolean;
};

interface BrandRow {
  id: number;
  name: string;
  slug: string;
}

/**
 * Resolves (or creates) the model a raw report name belongs to.
 *
 * The resolver is stateful on purpose: it caches brands for the duration of one
 * import and reuses `created` so the caller can count distinct placeholders.
 */
export function createPlaceholderResolver() {
  let brandCache: BrandRow[] | null = null;

  async function brandsOrLoad(): Promise<BrandRow[]> {
    if (!brandCache) {
      brandCache = await db
        .select({ id: brands.id, name: brands.name, slug: brands.slug })
        .from(brands);
    }
    return brandCache;
  }

  async function resolveBrandId(brandToken: string): Promise<number | null> {
    const normalized = normalize(brandToken);
    if (!normalized) return null;

    const wanted = new Set([normalized]);
    const alias = BRAND_ALIASES[normalized];
    if (alias) wanted.add(normalize(alias));

    const existing = (await brandsOrLoad()).find(
      (brand) => wanted.has(normalize(brand.name)) || wanted.has(normalize(brand.slug)),
    );
    if (existing) return existing.id;

    const displayName = alias ?? toDisplayName(brandToken);
    const baseSlug = slugify(displayName) || slugify(brandToken) || "marca";

    for (let suffix = 1; suffix <= 20; suffix++) {
      const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
      const [taken] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(eq(brands.slug, slug))
        .limit(1);
      if (taken) {
        brandCache?.push({ id: taken.id, name: displayName, slug });
        return taken.id;
      }

      const [created] = await db
        .insert(brands)
        .values({ name: displayName, slug, isActive: false })
        .onConflictDoNothing({ target: brands.slug })
        .returning({ id: brands.id });

      if (created) {
        brandCache?.push({ id: created.id, name: displayName, slug });
        return created.id;
      }
    }

    return null;
  }

  async function resolve(rawName: string): Promise<PlaceholderResolution | null> {
    const { brandToken, modelName } = splitReportName(rawName);
    if (!modelName) return null;

    const brandId = await resolveBrandId(brandToken);
    if (!brandId) return null;

    const modelSlug = slugify(modelName);
    if (!modelSlug) return null;

    const brand = (await brandsOrLoad()).find((row) => row.id === brandId);
    const brandSlug = brand?.slug ?? slugify(brandToken);
    const baseSlug = `${brandSlug}-${modelSlug}`;

    // Deterministic slug first: this is what makes a model reused next month
    // instead of being re-created under a suffixed slug.
    const [bySlug] = await db
      .select({ id: models.id, brandId: models.brandId })
      .from(models)
      .where(eq(models.slug, baseSlug))
      .limit(1);
    if (bySlug?.brandId === brandId) return { modelId: bySlug.id, created: false };

    // Same brand, same normalised name (covers placeholders created under a
    // suffixed slug before this resolver existed).
    const siblings = await db
      .select({ id: models.id, name: models.name })
      .from(models)
      .where(eq(models.brandId, brandId));
    const byName = siblings.find((row) => normalize(row.name) === normalize(modelName));
    if (byName) return { modelId: byName.id, created: false };

    const displayName = toDisplayName(modelName);

    for (let suffix = 1; suffix <= 50; suffix++) {
      const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;

      const [taken] = await db
        .select({ id: models.id, brandId: models.brandId })
        .from(models)
        .where(eq(models.slug, slug))
        .limit(1);
      if (taken) {
        if (taken.brandId === brandId) return { modelId: taken.id, created: false };
        continue; // slug belongs to another brand: try the next suffix
      }

      const [created] = await db
        .insert(models)
        .values({
          brandId,
          name: displayName,
          slug,
          isActive: false,
          needsEnrichment: true,
        })
        .onConflictDoNothing({ target: models.slug })
        .returning({ id: models.id });

      if (created) return { modelId: created.id, created: true };
    }

    return null;
  }

  return { resolve };
}
