// Fixed-window, in-memory rate limit per client key. Good enough for a single
// container; it resets on restart and is not shared between replicas.

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  /** Cap on tracked keys so a flood of spoofed IPs can't grow memory forever. */
  maxKeys?: number;
  now?: () => number;
}

export type RateResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
  now = Date.now,
}: RateLimiterOptions) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    hit(key: string): RateResult {
      const t = now();
      let w = windows.get(key);
      if (!w || t >= w.resetAt) {
        if (windows.size >= maxKeys) {
          for (const [k, v] of windows) if (t >= v.resetAt) windows.delete(k);
          if (windows.size >= maxKeys) windows.clear();
        }
        w = { count: 0, resetAt: t + windowMs };
        windows.set(key, w);
      }
      w.count++;
      if (w.count > limit) {
        return { ok: false, retryAfterSeconds: Math.ceil((w.resetAt - t) / 1000) };
      }
      return { ok: true };
    },
  };
}
