import { describe, expect, it } from "vitest";
import { consumeRateLimit } from "./_core/security";

describe("security controls", () => {
  it("limits repeated requests within a window", () => {
    const name = `test-${Date.now()}-${Math.random()}`;
    expect(consumeRateLimit(name, "198.51.100.10", 2, 60_000).allowed).toBe(true);
    expect(consumeRateLimit(name, "198.51.100.10", 2, 60_000).allowed).toBe(true);
    const blocked = consumeRateLimit(name, "198.51.100.10", 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });
});
