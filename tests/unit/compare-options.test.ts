import { describe, expect, it } from "vitest";
import type { CompareOptionBrand } from "@/lib/catalog/queries";
import { excludeSelectedYears } from "@/lib/compare/options";

function makeOptions(): CompareOptionBrand[] {
  return [
    {
      id: 1,
      name: "MG",
      slug: "mg",
      models: [
        {
          id: 6,
          name: "MG4 Urban",
          slug: "mg4-urban",
          versions: [
            {
              id: 1,
              name: "Comfort 43 kWh",
              slug: "comfort-43-kwh",
              years: [
                { id: 6, year: 2027, fuelType: "electric", isZeroKm: true },
                { id: 7, year: 2026, fuelType: "electric", isZeroKm: true },
              ],
            },
            {
              id: 2,
              name: "Luxury 43 kWh",
              slug: "luxury-43-kwh",
              years: [{ id: 8, year: 2027, fuelType: "electric", isZeroKm: true }],
            },
          ],
        },
      ],
    },
    {
      id: 2,
      name: "Fiat",
      slug: "fiat",
      models: [
        {
          id: 11,
          name: "Strada",
          slug: "strada",
          versions: [
            {
              id: 10,
              name: "Strada",
              slug: "strada",
              years: [{ id: 11, year: 2027, fuelType: "flex", isZeroKm: true }],
            },
          ],
        },
      ],
    },
  ];
}

describe("excludeSelectedYears", () => {
  it("keeps the full tree when nothing is selected", () => {
    const result = excludeSelectedYears(makeOptions(), []);
    expect(result).toHaveLength(2);
    expect(result[0].models[0].versions[0].years).toHaveLength(2);
  });

  it("removes a selected year from its version", () => {
    const result = excludeSelectedYears(makeOptions(), [6]);
    const mg4 = result.find((b) => b.id === 1)?.models[0];
    const comfort = mg4?.versions.find((v) => v.id === 1);
    expect(comfort?.years.map((y) => y.id)).toEqual([7]);
  });

  it("prunes a version whose only year is selected", () => {
    const result = excludeSelectedYears(makeOptions(), [11]);
    const fiat = result.find((b) => b.id === 2);
    // Strada's only year is selected, so the version, model, and brand vanish.
    expect(fiat).toBeUndefined();
  });

  it("prunes a model whose versions are all selected", () => {
    const result = excludeSelectedYears(makeOptions(), [6, 7, 8]);
    const mg = result.find((b) => b.id === 1);
    // All MG4 years selected → brand pruned entirely.
    expect(mg).toBeUndefined();
    expect(result.map((b) => b.id)).toEqual([2]);
  });

  it("prunes a brand when every model is gone", () => {
    const result = excludeSelectedYears(makeOptions(), [6, 7, 8, 11]);
    expect(result).toHaveLength(0);
  });

  it("is idempotent when the same id appears twice in selectedIds", () => {
    const result = excludeSelectedYears(makeOptions(), [6, 6, 7]);
    const mg = result.find((b) => b.id === 1);
    // Comfort's years (6, 7) are all selected (with a duplicate) → the version is pruned.
    expect(mg?.models[0].versions.some((v) => v.id === 1)).toBe(false);
    // Luxury 43 kWh (id 8) remains.
    expect(mg?.models[0].versions.map((v) => v.id)).toEqual([2]);
  });
});
