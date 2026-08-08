import type { CompareCar, SpecGrouped } from "@/lib/catalog/queries";
import { getScaledScore } from "@/lib/compare/spec-scale";

/**
 * Radar chart scoring — "which car is best based on specs".
 *
 * Each dimension is built from a set of contributing spec slugs. Numeric
 * specs are min-max normalized across the compared cars (0-100), inverted
 * when "lower is better" (e.g. 0-100 time, price). Yes/no specs count as
 * 100 when "Sim"/"yes", 0 otherwise. Scaled specs are non-numeric specs
 * with a quality gradient (transmission, headlights...) — they resolve to
 * a 0-100 score via the quality scale map and normalize like numeric specs.
 * The dimension score is the average of its normalized contributing values;
 * missing values are skipped.
 */

export interface RadarDimension {
  id: string;
  label: string;
  /** Spec slugs that contribute to this dimension. */
  specs: string[];
  /** Slugs that are "lower is better" (inverted in normalization). */
  lowerIsBetter?: string[];
  /** Slugs treated as boolean presence ("Sim"/"yes" = 100). */
  booleans?: string[];
  /** Non-numeric slugs scored via the quality scale map. */
  scaled?: string[];
}

export const RADAR_DIMENSIONS: RadarDimension[] = [
  {
    id: "performance",
    label: "Desempenho",
    specs: ["power", "torque", "top-speed", "acceleration-0-100", "displacement"],
    lowerIsBetter: ["acceleration-0-100"],
  },
  {
    id: "consumption",
    label: "Consumo",
    specs: [
      "consumption-city-gasoline",
      "consumption-highway-gasoline",
      "consumption-city-ethanol",
      "consumption-highway-ethanol",
    ],
  },
  {
    id: "space",
    label: "Espaço",
    specs: ["trunk", "wheelbase", "length"],
  },
  {
    id: "safety",
    label: "Segurança",
    specs: ["airbags"],
    booleans: ["esc", "tcs", "hill-assist"],
  },
  {
    id: "technology",
    label: "Tecnologia",
    specs: [],
    scaled: ["air-conditioning", "infotainment", "connectivity", "parking-assist"],
  },
  {
    id: "value",
    label: "Custo",
    specs: [],
    // Price comes from the model-year FIPE price (not the spec table).
    lowerIsBetter: [],
  },
];

export interface RadarScores {
  dimensions: { id: string; label: string }[];
  /** scores[carIndex][dimensionIndex] = 0..100 */
  scores: number[][];
}

/** Find a spec's numeric value within a car's grouped specs. */
function numericSpecValue(car: CompareCar, slug: string): number | null {
  for (const group of car.specs) {
    for (const spec of group.specs) {
      if (spec.slug === slug) {
        if (spec.numericValue != null) {
          const n = Number(spec.numericValue);
          if (!Number.isNaN(n)) return n;
        }
        if (spec.value != null) {
          const parsed = Number(String(spec.value).replace(",", "."));
          if (!Number.isNaN(parsed)) return parsed;
        }
        return null;
      }
    }
  }
  return null;
}

/** Find a spec's raw value string (for boolean presence checks). */
function rawSpecValue(car: CompareCar, slug: string): string | null {
  for (const group of car.specs) {
    for (const spec of group.specs) {
      if (spec.slug === slug) return spec.value ?? spec.displayValue ?? null;
    }
  }
  return null;
}

/** Resolve a scaled (non-numeric) spec to its 0-100 quality score. */
function scaledSpecValue(car: CompareCar, slug: string): number | null {
  for (const group of car.specs) {
    for (const spec of group.specs) {
      if (spec.slug === slug) {
        if (spec.numericValue != null) {
          const n = Number(spec.numericValue);
          if (!Number.isNaN(n)) return n;
        }
        return getScaledScore(slug, spec.value ?? spec.displayValue);
      }
    }
  }
  return null;
}

function isPresent(value: string | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  // Explicit negatives mean "absent". Anything else (e.g. "Sim", "8\" touchscreen",
  // "Automático digital", "Apple CarPlay") counts as present. "Sem X" (without X)
  // is also a negative signal (e.g. "Sem conectividade").
  const negatives = ["não", "nao", "no", "false", "0", "-", "—", "n/a"];
  if (negatives.includes(v)) return false;
  if (v.startsWith("sem ")) return false;
  return true;
}

/** Min-max normalize a numeric value to 0-100 across the given values. */
function normalize(value: number, min: number, max: number, invert: boolean): number {
  if (max === min) return 100; // no spread → treat as fully satisfied
  let n = ((value - min) / (max - min)) * 100;
  if (invert) n = 100 - n;
  return Math.max(0, Math.min(100, n));
}

/**
 * Compute radar scores for the given cars (1-3).
 *
 * Scoring is competitive (relative to the compared set), not absolute:
 * each dimension score reflects how a car ranks against its peers, not
 * against a fixed ideal. Two cars with identical specs in a category
 * both land at 50 (neutral — no advantage); the best car in a spread
 * approaches 100 while the weakest approaches 0. This ensures the radar
 * highlights differences that matter for decision-making.
 *
 * Uses priceFipe for the Custo dimension (lower price = higher score).
 */
export function computeRadarScores(cars: CompareCar[]): RadarScores {
  const dims = RADAR_DIMENSIONS;
  const scores: number[][] = cars.map((car) =>
    dims.map((dim) => {
      if (dim.id === "value") {
        // Custo: invert the FIPE price across cars.
        const prices = cars.map((c) => (c.priceFipe ? Number(c.priceFipe) : NaN));
        const valid = prices.filter((p) => !Number.isNaN(p));
        if (valid.length === 0 || Number.isNaN(Number(car.priceFipe))) return 0;
        const min = Math.min(...valid);
        const max = Math.max(...valid);
        return normalize(Number(car.priceFipe), min, max, true);
      }

      // Numeric specs: collect all cars' values for each contributing slug,
      // then normalize per-car against the global min/max.
      const numericParts: number[] = [];
      for (const slug of dim.specs) {
        const values = cars.map((c) => numericSpecValue(c, slug));
        const valid = values.filter((v): v is number => v != null && !Number.isNaN(v));
        if (valid.length === 0) continue;
        const min = Math.min(...valid);
        const max = Math.max(...valid);
        const mine = numericSpecValue(car, slug);
        if (mine == null || Number.isNaN(mine)) continue;
        const invert = dim.lowerIsBetter?.includes(slug) ?? false;
        numericParts.push(normalize(mine, min, max, invert));
      }

      // Scaled specs (non-numeric with a quality gradient): same treatment
      // as numeric specs, but the score comes from the quality scale map.
      const scaledSpecs = dim.scaled ?? [];
      for (const slug of scaledSpecs) {
        const values = cars.map((c) => scaledSpecValue(c, slug));
        const valid = values.filter((v): v is number => v != null && !Number.isNaN(v));
        if (valid.length === 0) continue;
        const min = Math.min(...valid);
        const max = Math.max(...valid);
        const mine = scaledSpecValue(car, slug);
        if (mine == null || Number.isNaN(mine)) continue;
        numericParts.push(normalize(mine, min, max, false));
      }

      // Boolean specs: presence counts as 100.
      let boolParts: number[] = [];
      if (dim.booleans) {
        boolParts = dim.booleans
          .map((slug) => rawSpecValue(car, slug))
          .filter((v): v is string => v != null)
          .map((v) => (isPresent(v) ? 100 : 0));
      }

      const parts = [...numericParts, ...boolParts];
      if (parts.length === 0) return 0;
      return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
    }),
  );

  // Second pass: normalize each dimension across the compared cars so the
  // radar shows relative advantage, not absolute feature presence. Scores
  // land in [20, 80] to avoid the "peaks and valleys" look where the best
  // car dominates at 100 and the worst disappears at 0. Ties stay at 50
  // (neutral). Dimensions where no car has any data stay at 0.
  const RANGE_MIN = 20;
  const RANGE_MAX = 80;
  const RANGE_SPAN = RANGE_MAX - RANGE_MIN;
  for (let di = 0; di < dims.length; di++) {
    const col = scores.map((row) => row[di]);
    const min = Math.min(...col);
    const max = Math.max(...col);
    if (min === max) {
      if (min > 0) {
        for (let ci = 0; ci < cars.length; ci++) scores[ci][di] = 50;
      }
    } else {
      for (let ci = 0; ci < cars.length; ci++) {
        scores[ci][di] = Math.round(
          RANGE_MIN + ((scores[ci][di] - min) / (max - min)) * RANGE_SPAN,
        );
      }
    }
  }

  return {
    dimensions: dims.map((d) => ({ id: d.id, label: d.label })),
    scores,
  };
}

/** Overall "best car" index (highest average score across dimensions). */
export function bestCarIndex(scores: RadarScores): number {
  const averages = scores.scores.map((row) => row.reduce((a, b) => a + b, 0) / row.length);
  return averages.indexOf(Math.max(...averages));
}

/**
 * Determine the best car(s) by counting dimension wins — whichever car
 * has the highest score in the most dimensions wins. Tied dimensions
 * (where multiple cars share the max) don't count toward any car. When
 * all cars have the same win count, all are returned as tied winners.
 */
export function bestCarIndices(scores: RadarScores): number[] {
  const dimCount = scores.dimensions.length;
  const carCount = scores.scores.length;
  const wins = new Array<number>(carCount).fill(0);

  for (let di = 0; di < dimCount; di++) {
    const col = scores.scores.map((row) => row[di]);
    const max = Math.max(...col);
    // Only count as a win if exactly one car holds the max (no tie)
    const maxCars = col.reduce<number[]>((acc, val, ci) => {
      if (val === max) acc.push(ci);
      return acc;
    }, []);
    if (maxCars.length === 1) wins[maxCars[0]]++;
  }

  const maxWins = Math.max(...wins);
  if (maxWins === 0) return scores.scores.map((_, i) => i);
  return wins.reduce<number[]>((acc, w, i) => {
    if (w === maxWins) acc.push(i);
    return acc;
  }, []);
}

export type { SpecGrouped };
