import { describe, expect, it } from "vitest";
import { fuelType } from "@/lib/db/schema";
import { seedSpecCategories } from "@/lib/db/seed-data";

describe("seedSpecCategories", () => {
  it("every spec category applies to all (null) or declares valid fuel types", () => {
    const validFuels = new Set<string>(fuelType.enumValues);
    for (const cat of seedSpecCategories) {
      const fuels = cat.applicableFuelTypes;
      if (fuels == null) continue;
      expect(fuels.length).toBeGreaterThan(0);
      for (const f of fuels) {
        expect(validFuels.has(f)).toBe(true);
      }
    }
  });

  it("declares the electric spec categories", () => {
    const slugs = seedSpecCategories.map((c) => c.slug);
    expect(slugs).toContain("range");
    expect(slugs).toContain("consumption-city-electric");
    expect(slugs).toContain("consumption-highway-electric");
  });
});
