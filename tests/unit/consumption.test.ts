import { describe, expect, it } from "vitest";
import { isConsumptionSlug, toKmPerKwh } from "@/lib/compare/consumption";

describe("toKmPerKwh", () => {
  it("converts electric kWh/100km to km/kWh", () => {
    expect(toKmPerKwh("consumption-city-electric", 20)).toBeCloseTo(5);
    expect(toKmPerKwh("consumption-highway-electric", 16)).toBeCloseTo(6.25);
  });

  it("converts gasoline km/l to km/kWh", () => {
    expect(toKmPerKwh("consumption-city-gasoline", 8.9)).toBeCloseTo(1);
    expect(toKmPerKwh("consumption-highway-gasoline", 13.35)).toBeCloseTo(1.5);
  });

  it("converts ethanol km/l to km/kWh", () => {
    expect(toKmPerKwh("consumption-city-ethanol", 6.4)).toBeCloseTo(1);
  });

  it("returns null for non-consumption slugs", () => {
    expect(toKmPerKwh("power", 120)).toBeNull();
  });

  it("lower kWh/100km yields higher km/kWh (higher is better)", () => {
    const efficient = toKmPerKwh("consumption-city-electric", 15);
    const inefficient = toKmPerKwh("consumption-city-electric", 20);
    expect(efficient).not.toBeNull();
    expect(inefficient).not.toBeNull();
    expect(Number(efficient)).toBeGreaterThan(Number(inefficient));
  });
});

describe("isConsumptionSlug", () => {
  it("recognizes consumption slugs", () => {
    expect(isConsumptionSlug("consumption-city-gasoline")).toBe(true);
    expect(isConsumptionSlug("consumption-highway-ethanol")).toBe(true);
    expect(isConsumptionSlug("consumption-city-electric")).toBe(true);
    expect(isConsumptionSlug("power")).toBe(false);
  });
});
