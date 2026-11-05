import { describe, expect, it } from "vitest";
import { parseSalesPeriod } from "@/lib/sales-period";

describe("parseSalesPeriod", () => {
  it("accepts a valid year/month pair from strings or numbers", () => {
    expect(parseSalesPeriod("2026", "10")).toEqual({ year: 2026, month: 10 });
    expect(parseSalesPeriod(2026, 10)).toEqual({ year: 2026, month: 10 });
  });

  it("rejects a month outside 1..12", () => {
    expect(parseSalesPeriod("2026", "0")).toBeNull();
    expect(parseSalesPeriod("2026", "13")).toBeNull();
    expect(parseSalesPeriod("2026", "-1")).toBeNull();
  });

  it("rejects missing or non-numeric values", () => {
    expect(parseSalesPeriod(undefined, undefined)).toBeNull();
    expect(parseSalesPeriod("abc", "10")).toBeNull();
    expect(parseSalesPeriod("2026", "")).toBeNull();
    expect(parseSalesPeriod(null, null)).toBeNull();
  });

  it("rejects an implausible year", () => {
    expect(parseSalesPeriod("1999", "10")).toBeNull();
    expect(parseSalesPeriod("3000", "10")).toBeNull();
  });
});
