/**
 * FENABRAVE model name matcher.
 *
 * FENABRAVE writes model names with brand prefixes and version suffixes
 * ("VW - T-CROSS 1.0 TSI"), while the catalog stores base model names
 * ("T-Cross"). Matching uses normalized token overlap with a confidence
 * score, and returns the best candidate above a threshold.
 */

export interface MatchCandidate {
  modelYearId: number;
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

/** Strip brand prefix ("VW -" / "GM -" / "FIAT ") and numeric version markers. */
export function stripBrandPrefix(rawName: string): string {
  return rawName.replace(/^[a-z0-9.]+\s*[-–—]\s*/i, "").trim();
}

/**
 * Score how well a catalog model name matches a raw FENABRAVE name.
 * Returns 0..1 (1 = exact token set match).
 */
export function scoreMatch(catalogName: string, rawName: string): number {
  const catTokens = tokens(catalogName);
  const rawTokens = tokens(stripBrandPrefix(rawName)).filter(
    (t) => !/^(1|1\.0|1\.3|1\.5|1\.6|2\.0)$/.test(t),
  );

  if (catTokens.length === 0 || rawTokens.length === 0) return 0;

  // Distinct catalog tokens present in the raw name
  const matched = catTokens.filter((t) => rawTokens.includes(t)).length;
  const rawOverlap = matched / rawTokens.length;
  const catCoverage = matched / catTokens.length;

  // Weight catalog coverage more heavily (catalog names are canonical)
  return catCoverage * 0.7 + rawOverlap * 0.3;
}

/** Pick the best match above a threshold. */
export function bestMatch(
  catalogName: string,
  candidates: { modelYearId: number; modelName: string; brandName: string }[],
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
