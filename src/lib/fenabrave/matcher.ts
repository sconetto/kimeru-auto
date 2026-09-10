/**
 * FENABRAVE model name matcher.
 *
 * FENABRAVE writes model names with brand prefixes and version suffixes
 * ("VW - T-CROSS 1.0 TSI"), while the catalog stores base model names
 * ("T-Cross"). Matching uses normalized token overlap with a confidence
 * score, and returns the best candidate above a threshold.
 */

export interface MatchCandidate {
  modelId: number;
  modelName: string;
  brandName: string;
  score: number;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ");
}

function tokens(s: string): string[] {
  return normalize(s).split(/\s+/).filter(Boolean);
}

/**
 * Trim/version markers that may trail a model name but don't distinguish one
 * model family from another ("1.0 TSI", "TURBO", "ENDURANCE").
 */
const VERSION_NOISE = new Set([
  "tsi",
  "tfsi",
  "turbo",
  "flex",
  "sport",
  "endurance",
  "freedom",
  "at",
  "mt",
  "cvt",
  "aut",
]);

/** Strip the brand prefix ("VW -" dash form, or "BRAND/MODEL" slash form). */
export function stripBrandPrefix(rawName: string): string {
  const slash = rawName.indexOf("/");
  if (slash !== -1) return rawName.slice(slash + 1).trim();
  return rawName.replace(/^[a-z0-9.]+\s*[-–—]\s*/i, "").trim();
}

/**
 * Score how well a catalog model name matches a raw FENABRAVE name.
 * Returns 0..1 (1 = every catalog token is present). A raw name with an
 * unexplained non-numeric word (e.g. "SW4", "CROSS") scores 0 — those words
 * indicate a different model family. Pure numbers and trim markers are ignored
 * so "T-CROSS 1.0 TSI" still matches "T-Cross" while "HILUX SW4" does not
 * match "Hilux".
 */
export function scoreMatch(catalogName: string, rawName: string): number {
  const catTokens = tokens(catalogName);
  const rawTokens = tokens(stripBrandPrefix(rawName));

  if (catTokens.length === 0 || rawTokens.length === 0) return 0;

  const unexplained = rawTokens.filter(
    (t) => !catTokens.includes(t) && !VERSION_NOISE.has(t) && !/^\d+$/.test(t),
  );
  if (unexplained.length > 0) return 0;

  const matched = catTokens.filter((t) => rawTokens.includes(t)).length;
  return matched / catTokens.length;
}

/** Pick the best match above a threshold. */
export function bestMatch(
  catalogName: string,
  candidates: { modelId: number; modelName: string; brandName: string }[],
): MatchCandidate | null {
  let best: MatchCandidate | null = null;
  for (const c of candidates) {
    const score = scoreMatch(c.modelName, catalogName);
    if (score > 0 && (!best || score > best.score)) {
      best = { ...c, score };
    }
  }
  // Threshold: catalog name should be mostly covered
  return best && best.score >= 0.55 ? best : null;
}
