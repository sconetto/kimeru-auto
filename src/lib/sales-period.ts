/** A FENABRAVE report month. Every sales read is scoped to exactly one. */
export interface SalesPeriod {
  year: number;
  month: number;
}

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

/**
 * Validate a `(year, month)` pair from untrusted input (URL params, env vars,
 * form fields). Returns null rather than coercing a bad pair, so callers fall
 * back to the latest period instead of querying nonsense.
 */
export function parseSalesPeriod(
  yearValue: string | number | null | undefined,
  monthValue: string | number | null | undefined,
): SalesPeriod | null {
  const year =
    typeof yearValue === "number" ? yearValue : Number.parseInt(String(yearValue ?? ""), 10);
  const month =
    typeof monthValue === "number" ? monthValue : Number.parseInt(String(monthValue ?? ""), 10);

  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;

  return { year, month };
}
