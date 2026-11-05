import { describe, it, expect } from "vitest";
import { createRateLimiter } from "../rateLimit";

describe("createRateLimiter", () => {
  it("allows up to the limit per window, then blocks with Retry-After", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 2, windowMs: 10_000, now: () => t });
    expect(rl.hit("a").ok).toBe(true);
    expect(rl.hit("a").ok).toBe(true);
    expect(rl.hit("a")).toEqual({ ok: false, retryAfterSeconds: 10 });
    expect(rl.hit("b").ok).toBe(true); // other clients unaffected
    t = 10_000;
    expect(rl.hit("a").ok).toBe(true); // new window
  });

  it("bounds the number of tracked keys", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 3, now: () => 0 });
    for (const k of ["a", "b", "c", "d"]) expect(rl.hit(k).ok).toBe(true);
    // Only the oldest window ("a") was evicted, so "a" starts fresh...
    expect(rl.hit("a").ok).toBe(true);
  });

  it("keeps active windows of recent keys when maxKeys overflows", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 3, now: () => t });
    for (const k of ["a", "b", "c"]) {
      expect(rl.hit(k).ok).toBe(true);
      t += 1000;
    }
    expect(rl.hit("d").ok).toBe(true); // overflow: evicts only "a"
    expect(rl.hit("c").ok).toBe(false); // recent key still limited
    expect(rl.hit("b").ok).toBe(false);
    expect(rl.hit("d").ok).toBe(false);
  });
});
