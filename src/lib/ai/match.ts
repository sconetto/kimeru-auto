/**
 * Fuzzy matching of AI-parsed names against catalog rows.
 *
 * The model may return "VW" or "Volkswagen" for a brand whose slug is
 * "volkswagen"; this maps the parsed name to the closest catalog row and
 * returns a confidence score so the admin can confirm.
 */

export interface BrandCandidate {
  id: number;
  name: string;
  slug: string;
}

export interface BrandMatch {
  id: number;
  name: string;
  score: number;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Match a parsed brand name to the closest catalog brand, or null if none qualify. */
export function matchBrandName(parsed: string, candidates: BrandCandidate[]): BrandMatch | null {
  const p = normalize(parsed);
  if (!p) return null;

  const exact = candidates.find((b) => normalize(b.name) === p || normalize(b.slug) === p);
  if (exact) return { id: exact.id, name: exact.name, score: 1 };

  const pTokens = p.split(" ").filter(Boolean);
  let best: BrandMatch | null = null;
  for (const b of candidates) {
    const bTokens = normalize(b.name).split(" ").filter(Boolean);
    const matched = pTokens.filter((t) => bTokens.includes(t)).length;
    const score = matched / Math.max(pTokens.length, bTokens.length);
    if (score > 0 && (!best || score > best.score)) {
      best = { id: b.id, name: b.name, score };
    }
  }

  return best && best.score >= 0.5 ? best : null;
}
