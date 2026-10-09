export interface RateRule {
  /** Max allowed calls inside the window. */
  limit: number;
  windowMs: number;
}

export type RateResult = { allowed: true } | { allowed: false; retryAfterSec: number };

// Bounds memory if someone sends requests from many different IPs.
const MAX_KEYS = 2000;

/**
 * In-memory sliding-window limiter with a per-key rule (e.g. per IP) and a global rule.
 * A call is counted only when both rules allow it.
 *
 * Best effort: state lives in one server instance, so on serverless hosting it resets when the
 * instance is recycled and is not shared between instances. It stops casual abuse; the hard
 * ceiling on spend is the spend limit set in the Anthropic Console.
 */
export function createRateLimiter(perKey: RateRule, global: RateRule) {
  const hitsByKey = new Map<string, number[]>();
  let globalHits: number[] = [];

  const recent = (hits: number[], windowMs: number, now: number) => hits.filter((t) => now - t < windowMs);
  const retryAfter = (hits: number[], windowMs: number, now: number) =>
    Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));

  return function check(key: string, now: number = Date.now()): RateResult {
    globalHits = recent(globalHits, global.windowMs, now);
    const keyHits = recent(hitsByKey.get(key) ?? [], perKey.windowMs, now);

    if (keyHits.length >= perKey.limit) {
      return { allowed: false, retryAfterSec: retryAfter(keyHits, perKey.windowMs, now) };
    }
    if (globalHits.length >= global.limit) {
      return { allowed: false, retryAfterSec: retryAfter(globalHits, global.windowMs, now) };
    }

    keyHits.push(now);
    globalHits.push(now);
    hitsByKey.delete(key); // re-insert so the Map stays ordered by last use
    hitsByKey.set(key, keyHits);
    while (hitsByKey.size > MAX_KEYS) {
      const leastRecentlyUsed = hitsByKey.keys().next().value as string;
      hitsByKey.delete(leastRecentlyUsed);
    }
    return { allowed: true };
  };
}

/**
 * Client IP. On Vercel, x-forwarded-for is set by the platform (a client-supplied value is
 * overwritten), so the first entry is the real client.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
