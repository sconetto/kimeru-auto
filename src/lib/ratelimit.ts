import { cache } from "@/lib/fipe/cache";

export interface RateLimitResult {
  /** Whether the request is allowed to proceed. */
  success: boolean;
  /** Maximum allowed requests per window. */
  limit: number;
  /** Requests remaining in the current window (0 when limited). */
  remaining: number;
  /** Milliseconds until the current window resets. */
  reset: number;
}

/** Compute the fixed-window cache key for an identifier. Exported so callers
 * can reset a counter on success (e.g. clearing login throttles after a
 * successful sign-in). */
export function rateLimitKey(windowSeconds: number, identifier: string): string {
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  return `ratelimit:${window}:${identifier}`;
}

/**
 * Fixed-window rate limiter backed by the shared cache (Upstash Redis in
 * production, in-memory fallback in dev). Window buckets are derived from the
 * wall clock so no per-request state is needed beyond a counter + TTL.
 */
export function createRateLimiter(options: {
  limit: number;
  windowSeconds: number;
}): (identifier: string) => Promise<RateLimitResult> {
  const { limit, windowSeconds } = options;
  const windowMs = windowSeconds * 1000;

  return async function rateLimit(identifier: string): Promise<RateLimitResult> {
    const key = rateLimitKey(windowSeconds, identifier);

    const count = await cache.incr(key);
    if (count === 1) {
      // First hit in this window — align the counter TTL with the window end
      // (plus a small skew buffer) so the key never lingers past its bucket.
      await cache.expire(key, windowSeconds);
    }

    const currentWindow = Math.floor(Date.now() / windowMs);
    const reset = (currentWindow + 1) * windowMs - Date.now();
    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      reset,
    };
  };
}

/** Extract the client IP from a request, tolerating proxy chains. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Origin check for same-origin CSRF defense on state-changing endpoints. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true; // non-browser clients / no header — rely on auth
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
