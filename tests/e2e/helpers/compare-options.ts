import type { APIRequestContext } from "@playwright/test";

interface CompareYear {
  id: number;
  year: number;
  fuelType: string;
  isZeroKm: boolean;
}

interface CompareVersion {
  id: number;
  name: string;
  slug: string;
  years: CompareYear[];
}

interface CompareModel {
  id: number;
  name: string;
  slug: string;
  versions: CompareVersion[];
}

interface CompareBrand {
  id: number;
  name: string;
  slug: string;
  models: CompareModel[];
}

/**
 * Resolve a model slug to its newest comparable modelYearId via the live
 * /api/catalog/compare-options cascade tree. modelYearIds are auto-generated
 * at seed time, so E2E URLs must be built from real ids instead of hardcoding.
 */
export async function compareModelYearIds(
  request: APIRequestContext,
  slugs: string[],
): Promise<number[]> {
  const resp = await request.get("/api/catalog/compare-options");
  if (!resp.ok()) throw new Error(`compare-options returned ${resp.status()}`);
  const { brands } = (await resp.json()) as { brands: CompareBrand[] };

  const ids: number[] = [];
  for (const slug of slugs) {
    const model = brands.flatMap((b) => b.models).find((m) => m.slug === slug);
    if (!model) throw new Error(`compare-options has no model with slug "${slug}"`);
    const year = model.versions[0]?.years[0];
    if (!year) throw new Error(`model "${slug}" has no comparable year`);
    ids.push(year.id);
  }
  return ids;
}
