import { describe, expect, it } from "vitest";
import { formatDate, formatMonthYear, formatSpecValue } from "@/lib/format";

describe("formatSpecValue", () => {
  it("formats an integer numeric value with unit", () => {
    expect(
      formatSpecValue({ value: "120", numericValue: "120", unit: "cv", isNumeric: true }),
    ).toBe("120 cv");
  });

  it("formats a decimal value with pt-BR locale", () => {
    expect(
      formatSpecValue(
        { value: "17.5", numericValue: "17.5", unit: "km/l", isNumeric: true },
        { locale: "pt-BR" },
      ),
    ).toBe("17,5 km/l");
  });

  it("formats a decimal value with en-US locale", () => {
    expect(
      formatSpecValue(
        { value: "17.5", numericValue: "17.5", unit: "km/l", isNumeric: true },
        { locale: "en-US" },
      ),
    ).toBe("17.5 km/l");
  });

  it("renders a text value as-is without a unit", () => {
    expect(formatSpecValue({ value: "Flex", isNumeric: false, unit: null })).toBe("Flex");
  });

  it("returns the localized unavailable text for a missing value", () => {
    expect(formatSpecValue({ value: null, numericValue: null, isNumeric: false })).toBe(
      "Não informado",
    );
    expect(
      formatSpecValue({ value: null, numericValue: null, isNumeric: false }, { locale: "en-US" }),
    ).toBe("Not informed");
  });

  it("guards against double units for legacy values that already embed one", () => {
    expect(formatSpecValue({ value: "120 cv", unit: "cv", isNumeric: false })).toBe("120 cv");
  });

  it("applies a unit override (e.g. normalized consumption)", () => {
    expect(
      formatSpecValue(
        { value: null, numericValue: 12.34, isNumeric: true },
        { unitOverride: "km/kWh" },
      ),
    ).toBe("12,34 km/kWh");
  });

  it("prefixes currency units (R$ before the value) with two decimals", () => {
    expect(
      formatSpecValue({
        value: "129993.00",
        numericValue: "129993.0000",
        unit: "R$",
        isNumeric: true,
      }),
    ).toBe("R$ 129.993,00");
  });

  it("suffixes percent units without a space", () => {
    expect(
      formatSpecValue({ value: "3,2", numericValue: "3.2000", unit: "%", isNumeric: true }),
    ).toBe("3,2%");
  });

  it("does not append a unit to free text even on a numeric category", () => {
    expect(
      formatSpecValue({
        value: "Airbag frontal duplo",
        numericValue: null,
        unit: "un.",
        isNumeric: true,
      }),
    ).toBe("Airbag frontal duplo");
  });

  it("formats a month/year reference date", () => {
    expect(formatMonthYear(new Date(2026, 7, 12))).toBe("08/2026");
  });

  it("formats an added-on full date", () => {
    expect(formatDate(new Date(2026, 7, 12))).toBe("12/08/2026");
  });
});
