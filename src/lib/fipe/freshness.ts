/**
 * FIPE price freshness policy.
 *
 * The database is the source of truth for FIPE prices; Redis is only a hot
 * cache in front. A stored price is "fresh" when it was updated within the
 * DB_FRESHNESS_DAYS window — anything older should be refetched from the API.
 */

export const DB_FRESHNESS_DAYS = 30;
export const DB_FRESHNESS_MS = DB_FRESHNESS_DAYS * 24 * 60 * 60 * 1000;

/** Whether a model-year's stored price is fresh enough to skip the API. */
export function isDbPriceFresh(updatedAt: Date | null): boolean {
  if (!updatedAt) return false;
  return Date.now() - updatedAt.getTime() < DB_FRESHNESS_MS;
}
