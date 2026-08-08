import { describe, expect, it } from "vitest";
import type { CompareCar, SpecGrouped } from "@/lib/catalog/queries";
import { bestCarIndex, bestCarIndices, computeRadarScores } from "@/lib/compare/scoring";
import type { specGroup } from "@/lib/db/schema";

function makeCar(
  slug: string,
  priceFipe: string | null,
  specs: Record<string, string | number>,
): CompareCar {
  const groups = new Map<string, { name: string; specs: SpecGrouped["specs"] }>();
  for (const [slugKey, raw] of Object.entries(specs)) {
    const group = slugKey.startsWith("consumption") ? "consumption" : "engine";
    const entry = groups.get(group) ?? { name: group, specs: [] };
    const numeric = typeof raw === "number" ? String(raw) : null;
    entry.specs.push({
      categoryId: 0,
      name: slugKey,
      slug: slugKey,
      unit: null,
      value: String(raw),
      numericValue: numeric,
      displayValue: String(raw),
      higherIsBetter: true,
      isNumeric: typeof raw === "number",
    });
    groups.set(group, entry);
  }
  return {
    slug,
    brandName: "Marca",
    modelName: slug,
    year: 2025,
    fuelType: "flex",
    isZeroKm: true,
    priceFipe,
    category: "hatch",
    sizeCategory: "compacto",
    specs: [...groups.entries()].map(([g, v]) => ({
      group: g as (typeof specGroup.enumValues)[number],
      label: g,
      specs: v.specs,
    })),
    sales: null,
    editorialRating: null,
  };
}

describe("computeRadarScores", () => {
  it("scores higher power as better (higher-is-better)", () => {
    const fast = makeCar("fast", "100000", { power: 200 });
    const slow = makeCar("slow", "100000", { power: 100 });
    const scores = computeRadarScores([fast, slow]);
    const perfIdx = scores.dimensions.findIndex((d) => d.id === "performance");
    // fast scores higher on performance
    expect(scores.scores[0][perfIdx]).toBeGreaterThan(scores.scores[1][perfIdx]);
  });

  it("inverts lower-is-better specs (0-100 time)", () => {
    const fast = makeCar("fast", "100000", { "acceleration-0-100": 8 });
    const slow = makeCar("slow", "100000", { "acceleration-0-100": 12 });
    const scores = computeRadarScores([fast, slow]);
    const perfIdx = scores.dimensions.findIndex((d) => d.id === "performance");
    // faster 0-100 (lower) should score higher
    expect(scores.scores[0][perfIdx]).toBeGreaterThan(scores.scores[1][perfIdx]);
  });

  it("scores lower price as better in Custo", () => {
    const cheap = makeCar("cheap", "50000", {});
    const pricey = makeCar("pricey", "150000", {});
    const scores = computeRadarScores([cheap, pricey]);
    const valueIdx = scores.dimensions.findIndex((d) => d.id === "value");
    expect(scores.scores[0][valueIdx]).toBeGreaterThan(scores.scores[1][valueIdx]);
  });

  it("counts boolean presence (Sim/Não)", () => {
    const withEsc = makeCar("a", "100000", { esc: "Sim", tcs: "Sim", "hill-assist": "Sim" });
    const without = makeCar("b", "100000", { esc: "Não", tcs: "Não", "hill-assist": "Não" });
    const scores = computeRadarScores([withEsc, without]);
    const safetyIdx = scores.dimensions.findIndex((d) => d.id === "safety");
    expect(scores.scores[0][safetyIdx]).toBeGreaterThan(scores.scores[1][safetyIdx]);
  });

  it("handles identical values (no spread) without NaN", () => {
    const a = makeCar("a", "100000", { power: 120, "acceleration-0-100": 10 });
    const b = makeCar("b", "100000", { power: 120, "acceleration-0-100": 10 });
    const scores = computeRadarScores([a, b]);
    for (const row of scores.scores) {
      for (const s of row) expect(Number.isNaN(s)).toBe(false);
    }
    expect(scores.scores[0]).toEqual(scores.scores[1]);
  });

  it("all scores stay within 0-100", () => {
    const a = makeCar("a", "80000", {
      power: 150,
      torque: 20,
      "top-speed": 200,
      "acceleration-0-100": 9,
    });
    const b = makeCar("b", "120000", {
      power: 100,
      torque: 15,
      "top-speed": 180,
      "acceleration-0-100": 11,
    });
    const scores = computeRadarScores([a, b]);
    for (const row of scores.scores) {
      for (const s of row) {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("bestCarIndex", () => {
  it("returns the car with the highest average score", () => {
    const a = makeCar("a", "50000", { power: 200, esc: "Sim", tcs: "Sim" });
    const b = makeCar("b", "200000", { power: 100, esc: "Não", tcs: "Não" });
    const scores = computeRadarScores([a, b]);
    expect(bestCarIndex(scores)).toBe(0);
  });
});

describe("bestCarIndices", () => {
  it("returns the car with the most dimension wins", () => {
    const a = makeCar("a", "50000", { power: 200, esc: "Sim", tcs: "Sim" });
    const b = makeCar("b", "200000", { power: 100, esc: "Não", tcs: "Não" });
    const scores = computeRadarScores([a, b]);
    expect(bestCarIndices(scores)).toEqual([0]);
  });

  it("returns all cars when tie", () => {
    const a = makeCar("a", "100000", { power: 150 });
    const b = makeCar("b", "100000", { power: 150 });
    const scores = computeRadarScores([a, b]);
    expect(bestCarIndices(scores).sort()).toEqual([0, 1]);
  });

  it("handles 3+ cars with clear split", () => {
    const a = makeCar("a", "50000", { power: 200 });
    const b = makeCar("b", "70000", { power: 150 });
    const c = makeCar("c", "120000", { power: 100 });
    const scores = computeRadarScores([a, b, c]);
    const winners = bestCarIndices(scores);
    expect(winners.length).toBe(1);
  });
});

describe("technology dimension with descriptive values (regression: all cars scored 0)", () => {
  it("scores descriptive values as present, not zero", () => {
    const equipped = makeCar("a", "100000", {
      "air-conditioning": "Automático digital",
      infotainment: '8" touchscreen',
      connectivity: "Apple CarPlay / Android Auto",
    });
    const scores = computeRadarScores([equipped]);
    const techIdx = scores.dimensions.findIndex((d) => d.id === "technology");
    expect(scores.scores[0][techIdx]).toBeGreaterThan(0);
  });

  it("distinguishes equipped from explicit-negative", () => {
    const equipped = makeCar("a", "100000", {
      "air-conditioning": "Automático digital",
      infotainment: '8" touchscreen',
      connectivity: "Apple CarPlay",
    });
    const basic = makeCar("b", "100000", {
      "air-conditioning": "Manual",
      infotainment: '7" touchscreen',
      connectivity: "Sem conectividade",
    });
    const scores = computeRadarScores([equipped, basic]);
    const techIdx = scores.dimensions.findIndex((d) => d.id === "technology");
    expect(scores.scores[0][techIdx]).toBeGreaterThan(scores.scores[1][techIdx]);
  });

  it("scales non-numeric specs by quality (CVT > Automática > Manual)", () => {
    const cvt = makeCar("a", "100000", {
      "transmission-type": "CVT",
      "air-conditioning": "Automático digital dual-zone",
    });
    const auto = makeCar("b", "100000", {
      "transmission-type": "Automática",
      "air-conditioning": "Automático digital",
    });
    const manual = makeCar("c", "100000", {
      "transmission-type": "Manual",
      "air-conditioning": "Manual",
    });
    const scores = computeRadarScores([cvt, auto, manual]);
    const techIdx = scores.dimensions.findIndex((d) => d.id === "technology");
    expect(scores.scores[0][techIdx]).toBeGreaterThan(scores.scores[1][techIdx]);
    expect(scores.scores[1][techIdx]).toBeGreaterThan(scores.scores[2][techIdx]);
  });
});
