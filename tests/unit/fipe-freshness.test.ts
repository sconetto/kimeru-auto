import { describe, expect, it } from "vitest";
import { isDbPriceFresh } from "@/lib/fipe/freshness";

describe("isDbPriceFresh", () => {
  const now = Date.now();

  it("returns true for a row updated within the 30-day window", () => {
    const recent = new Date(now - 29 * 24 * 60 * 60 * 1000);
    expect(isDbPriceFresh(recent)).toBe(true);
  });

  it("returns false for a row updated exactly at the 30-day boundary", () => {
    const boundary = new Date(now - 30 * 24 * 60 * 60 * 1000);
    expect(isDbPriceFresh(boundary)).toBe(false);
  });

  it("returns false for a row updated beyond 30 days", () => {
    const stale = new Date(now - 45 * 24 * 60 * 60 * 1000);
    expect(isDbPriceFresh(stale)).toBe(false);
  });

  it("returns false when the timestamp is null (no price yet)", () => {
    expect(isDbPriceFresh(null)).toBe(false);
  });

  it("returns true for a just-updated row (fresh fetch)", () => {
    expect(isDbPriceFresh(new Date())).toBe(true);
  });
});
