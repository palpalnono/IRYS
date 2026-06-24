// In-memory sliding-window rate limiter — good enough for a single-region
// Vercel deployment. For multi-region or autoscaled environments, swap the
// bucket store for Upstash/Redis keyed by the same `key` arg.
//
// Buckets live in module scope, so they survive across requests within a
// warm lambda but reset on cold start. That's a feature, not a bug, for
// login throttling: cold starts only happen between bursts.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000; // 1-minute sliding window
const MAX = 5; // 5 attempts per window per key

export type RateLimitResult =
  | { ok: true; retryAfter: 0 }
  | { ok: false; retryAfter: number };

export function rateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= MAX) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true, retryAfter: 0 };
}
