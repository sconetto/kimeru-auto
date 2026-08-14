import { describe, expect, it } from "vitest";
import { getScaledScore, specScaleMap } from "@/lib/compare/spec-scale";

describe("specScaleMap", () => {
  it("covers all expected non-numeric specs", () => {
    for (const slug of [
      "transmission-type",
      "brakes-rear",
      "suspension-rear",
      "steering-type",
      "headlights",
      "wheels",
      "air-conditioning",
      "infotainment",
      "connectivity",
      "parking-assist",
      "injection",
      "fuel-type",
      "warranty-total",
    ]) {
      expect(specScaleMap[slug], `${slug} in map`).toBeDefined();
    }
  });
});

describe("getScaledScore", () => {
  it("scores transmission tiers CVT > Automática > Manual", () => {
    expect(getScaledScore("transmission-type", "CVT")).toBe(100);
    expect(getScaledScore("transmission-type", "Automática")).toBe(75);
    expect(getScaledScore("transmission-type", "Manual")).toBe(50);
  });

  it("matches substring patterns (dual-zone beats digital)", () => {
    expect(getScaledScore("air-conditioning", "Automático digital dual-zone")).toBe(85);
    expect(getScaledScore("air-conditioning", "Automático digital")).toBe(70);
    expect(getScaledScore("air-conditioning", "Manual")).toBe(35);
  });

  it("is accent-insensitive", () => {
    expect(getScaledScore("steering-type", "Elétrica")).toBe(70);
    expect(getScaledScore("steering-type", "Eletrica")).toBe(70);
    expect(getScaledScore("suspension-rear", "Eixo de torção")).toBe(50);
    expect(getScaledScore("suspension-rear", "Eixo de torcao")).toBe(50);
  });

  it("scores headlights and wheels tiers", () => {
    expect(getScaledScore("headlights", "Full LED")).toBe(100);
    expect(getScaledScore("headlights", "Projetor LED")).toBe(85);
    expect(getScaledScore("headlights", "LED")).toBe(70);
    expect(getScaledScore("headlights", "Halógeno")).toBe(35);
    expect(getScaledScore("wheels", 'Liga leve 16"')).toBe(80);
    expect(getScaledScore("wheels", 'Liga leve 15"')).toBe(60);
  });

  it("scores warranty by years mentioned", () => {
    expect(getScaledScore("warranty-total", "5 anos")).toBe(100);
    expect(getScaledScore("warranty-total", "3 anos")).toBe(60);
    expect(getScaledScore("warranty-total", "3 anos + 5 anos (bateria híbrida)")).toBe(100);
  });

  it("returns the default score for unknown values", () => {
    expect(getScaledScore("transmission-type", "Automatizada")).toBe(50);
    expect(getScaledScore("headlights", "Xenônio")).toBe(50);
  });

  it("returns 50 for unknown specs and missing values", () => {
    expect(getScaledScore("unknown-spec", "anything")).toBe(50);
    expect(getScaledScore("transmission-type", null)).toBe(50);
    expect(getScaledScore("transmission-type", "")).toBe(50);
  });

  it("handles the booleans-adjacent specs with a default", () => {
    expect(getScaledScore("esc", "Sim")).toBe(50); // not in map → default
  });
});
