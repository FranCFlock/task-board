import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "./rate-limit";

const MIN = 60_000;
const T0 = 1_000_000;

describe("createRateLimiter", () => {
  const limiter = () => createRateLimiter({ limit: 3, windowMs: 10 * MIN }, { limit: 5, windowMs: 60 * MIN });

  it("allows up to the per-key limit, then blocks", () => {
    const check = limiter();
    expect([0, 1, 2].map((i) => check("a", T0 + i * 1000).allowed)).toEqual([true, true, true]);
    expect(check("a", T0 + 3000).allowed).toBe(false);
  });

  it("reports how long until the oldest call leaves the window", () => {
    const check = limiter();
    for (let i = 0; i < 3; i++) check("a", T0 + i * 1000);
    expect(check("a", T0 + 3000)).toEqual({ allowed: false, retryAfterSec: 597 });
  });

  it("does not count blocked calls", () => {
    const check = limiter();
    for (let i = 0; i < 3; i++) check("a", T0 + i * 1000);
    for (let i = 0; i < 10; i++) check("a", T0 + 4000 + i); // blocked, must not extend the penalty
    expect(check("a", T0 + 10 * MIN + 1).allowed).toBe(true);
  });

  it("limits each key independently", () => {
    const check = limiter();
    for (let i = 0; i < 3; i++) check("a", T0 + i);
    expect(check("a", T0 + 10).allowed).toBe(false);
    expect(check("b", T0 + 11).allowed).toBe(true);
  });

  it("slides the window instead of resetting it", () => {
    const check = limiter();
    check("a", T0);
    check("a", T0 + 5 * MIN);
    check("a", T0 + 6 * MIN);
    expect(check("a", T0 + 9 * MIN).allowed).toBe(false);
    expect(check("a", T0 + 10 * MIN + 1).allowed).toBe(true); // only the first call has expired
    expect(check("a", T0 + 10 * MIN + 2).allowed).toBe(false);
  });

  it("applies the global limit across keys", () => {
    const check = limiter();
    ["a", "a", "b", "b", "c"].forEach((key, i) => expect(check(key, T0 + i).allowed).toBe(true));
    const blocked = check("d", T0 + 10);
    expect(blocked.allowed).toBe(false);
  });

  it("frees the global quota once its window passes", () => {
    const check = limiter();
    ["a", "a", "b", "b", "c"].forEach((key, i) => check(key, T0 + i));
    expect(check("d", T0 + 61 * MIN).allowed).toBe(true);
  });

  it("stays bounded when many different keys show up", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 10 * MIN }, { limit: 1_000_000, windowMs: 10 * MIN });
    for (let i = 0; i < 5000; i++) check(`ip-${i}`, 1000 + i);
    expect(check("ip-4999", 6000).allowed).toBe(false); // recent keys are still limited
    expect(check("ip-0", 6001).allowed).toBe(true); // the oldest was evicted
  });
});

describe("clientIp", () => {
  it("uses the first x-forwarded-for entry", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to a fixed value", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
