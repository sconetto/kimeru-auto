import { NextResponse } from "next/server";
import { safeCacheGet, safeCacheSet } from "./cache";
import { FipeApiError } from "./client";

/**
 * Map a FIPE client failure onto an HTTP response for our own API routes so the
 * browser gets a usable status + code instead of a generic 500.
 */
export function fipeErrorResponse(err: unknown): NextResponse {
  if (err instanceof FipeApiError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

/**
 * How long the last good copy is kept after it expires from the fresh slot.
 * Reference data is month-granular, so a month-old copy is still accurate —
 * far better than showing "could not load" during an upstream hiccup.
 */
const STALE_TTL_SECONDS = 30 * 24 * 60 * 60;

const staleKey = (key: string) => `${key}:stale`;

/**
 * Read-through cache for the FIPE reference routes.
 *
 * Three failure modes are deliberately not surfaced to the browser:
 * - a KV read/write error behaves like a cache miss (see safeCache*)
 * - an upstream failure falls back to the last good copy, served as
 *   `X-Cache: STALE`, so a Cloudflare 522 never blanks the dropdowns
 * Only when we have never successfully fetched the key does it return an error.
 */
export async function cachedJson<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<NextResponse> {
  const fresh = await safeCacheGet<T>(key);
  if (fresh) {
    return NextResponse.json(fresh, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const value = await load();
    await safeCacheSet(key, value, ttlSeconds);
    await safeCacheSet(staleKey(key), value, STALE_TTL_SECONDS);
    return NextResponse.json(value, { headers: { "X-Cache": "MISS" } });
  } catch (err) {
    const stale = await safeCacheGet<T>(staleKey(key));
    if (stale) {
      console.error(`[fipe] upstream failed for ${key}, serving stale copy`, err);
      return NextResponse.json(stale, { headers: { "X-Cache": "STALE" } });
    }
    console.error(`[fipe] upstream failed for ${key}, no stale copy available`, err);
    return fipeErrorResponse(err);
  }
}
