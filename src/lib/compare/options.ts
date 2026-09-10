import type { CompareOptionBrand, CompareOptionYear } from "@/lib/catalog/queries";

/**
 * Filter a compare-options tree so that only model-years not already selected
 * are offered at every level. Brand/model/version nodes with no remaining
 * qualifying leaves are pruned.
 */
export function excludeSelectedYears(
  brands: CompareOptionBrand[],
  selectedIds: number[],
): CompareOptionBrand[] {
  const selected = new Set(selectedIds);

  return brands
    .map((brand) => ({
      ...brand,
      models: brand.models
        .map((model) => ({
          ...model,
          versions: model.versions
            .map((version) => ({
              ...version,
              years: version.years.filter((y: CompareOptionYear) => !selected.has(y.id)),
            }))
            .filter((version) => version.years.length > 0),
        }))
        .filter((model) => model.versions.length > 0),
    }))
    .filter((brand) => brand.models.length > 0);
}
