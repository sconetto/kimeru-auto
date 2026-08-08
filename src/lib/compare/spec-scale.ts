/**
 * Quality scale for non-numeric car specs.
 *
 * Non-numeric specs (transmission, steering, headlights, ...) carry a text
 * value with an implicit quality gradient. This map turns those values into
 * 0-100 scores so the comparison radar can differentiate cars beyond a
 * boolean present/absent signal.
 *
 * Each spec lists ordered rules: the first case-insensitive substring match
 * wins (most-specific patterns first). If nothing matches, defaultScore
 * (usually 50, the neutral midpoint) applies.
 */

interface ScaleRule {
  /** Case-insensitive substring to match (accent-insensitive). */
  pattern: string;
  score: number;
}

export interface SpecScale {
  rules: ScaleRule[];
  defaultScore: number;
}

/** Strip accents so "Elétrica" matches "eletrica". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export const specScaleMap: Record<string, SpecScale> = {
  "transmission-type": {
    rules: [
      { pattern: "cvt", score: 100 },
      { pattern: "automatica", score: 75 },
      { pattern: "manual", score: 50 },
    ],
    defaultScore: 50,
  },
  "brakes-rear": {
    rules: [
      { pattern: "disco", score: 70 },
      { pattern: "tambor", score: 35 },
    ],
    defaultScore: 50,
  },
  "suspension-rear": {
    rules: [
      { pattern: "multi-link", score: 100 },
      { pattern: "independente", score: 100 },
      { pattern: "eixo de torcao", score: 50 },
    ],
    defaultScore: 50,
  },
  "steering-type": {
    rules: [
      { pattern: "eletrica progressiva", score: 100 },
      { pattern: "eletrica", score: 70 },
      { pattern: "hidraulica", score: 30 },
    ],
    defaultScore: 50,
  },
  headlights: {
    rules: [
      { pattern: "full led", score: 100 },
      { pattern: "matrix", score: 100 },
      { pattern: "projetor", score: 85 },
      { pattern: "led", score: 70 },
      { pattern: "halogeno", score: 35 },
    ],
    defaultScore: 50,
  },
  wheels: {
    rules: [
      { pattern: "18", score: 100 },
      { pattern: "17", score: 85 },
      { pattern: "16", score: 80 },
      { pattern: "15", score: 60 },
      { pattern: "aco", score: 30 },
    ],
    defaultScore: 50,
  },
  "air-conditioning": {
    rules: [
      { pattern: "tri-zone", score: 100 },
      { pattern: "tri zone", score: 100 },
      { pattern: "dual-zone", score: 85 },
      { pattern: "dual zone", score: 85 },
      { pattern: "automatico", score: 70 },
      { pattern: "manual", score: 35 },
    ],
    defaultScore: 50,
  },
  infotainment: {
    rules: [
      { pattern: "12", score: 100 },
      { pattern: "10.5", score: 95 },
      { pattern: "10", score: 90 },
      { pattern: "8", score: 70 },
      { pattern: "7", score: 50 },
    ],
    defaultScore: 50,
  },
  connectivity: {
    rules: [
      { pattern: "sem fio", score: 100 },
      { pattern: "carplay", score: 70 },
      { pattern: "android auto", score: 70 },
    ],
    defaultScore: 50,
  },
  "parking-assist": {
    rules: [
      { pattern: "360", score: 100 },
      { pattern: "camera", score: 75 },
      { pattern: "sensor", score: 50 },
    ],
    defaultScore: 50,
  },
  injection: {
    rules: [
      { pattern: "direta", score: 100 },
      { pattern: "multiponto", score: 50 },
    ],
    defaultScore: 50,
  },
  "fuel-type": {
    rules: [
      { pattern: "hibrido", score: 100 },
      { pattern: "flex", score: 60 },
    ],
    defaultScore: 50,
  },
  "warranty-total": {
    rules: [
      { pattern: "5 anos", score: 100 },
      { pattern: "4 anos", score: 80 },
      { pattern: "3 anos", score: 60 },
      { pattern: "2 anos", score: 40 },
    ],
    defaultScore: 50,
  },
};

/** Resolve a non-numeric spec value to a 0-100 quality score. */
export function getScaledScore(slug: string, value: string | null | undefined): number {
  if (!value) return specScaleMap[slug]?.defaultScore ?? 50;
  const scale = specScaleMap[slug];
  if (!scale) return 50;
  const normalized = normalize(value);
  for (const rule of scale.rules) {
    if (normalized.includes(normalize(rule.pattern))) return rule.score;
  }
  return scale.defaultScore;
}
