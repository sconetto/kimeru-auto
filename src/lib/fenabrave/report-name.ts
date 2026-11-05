import { stripBrandPrefix } from "./matcher";

/**
 * Pure name helpers for report rows. Kept separate from `placeholder.ts` so
 * they can be unit-tested (and reused) without a database connection.
 */

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** "VW/SONG PRO" → { brandToken: "VW", modelName: "SONG PRO" }. */
export function splitReportName(rawName: string): { brandToken: string; modelName: string } {
  const slash = rawName.indexOf("/");
  if (slash !== -1) {
    return {
      brandToken: rawName.slice(0, slash).trim(),
      modelName: rawName.slice(slash + 1).trim(),
    };
  }

  const modelName = stripBrandPrefix(rawName);
  const brandToken = rawName
    .slice(0, rawName.length - modelName.length)
    .replace(/[-–—/\s]+$/, "")
    .trim();
  return { brandToken, modelName };
}

/**
 * Title-case the report's SHOUTED names while leaving anything alphanumeric
 * ("HB20", "SW4", "AION") untouched, so placeholders read like catalog names.
 */
export function toDisplayName(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      /[0-9]/.test(word) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1),
    )
    .join(" ");
}
