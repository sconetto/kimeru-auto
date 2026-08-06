import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { bestMatch, scoreMatch, stripBrandPrefix } from "@/lib/fenabrave/matcher";
import { parseFenabraveXlsx } from "@/lib/fenabrave/parser";

function buildWorkbook(rows: unknown[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Automóveis e Comerciais Leves");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

const sampleReport = [
  ["FENABRAVE — Emplacamentos", "", ""],
  ["Automóveis e Comerciais Leves", "", ""],
  ["POS", "MARCA/MODELO", "JULHO 2026", "JUNHO 2026"],
  ["1", "VW - T-CROSS 1.0 TSI", "9432", "8120"],
  ["2", "FIAT - STRADA ENDURANCE 1.3", "9984", "9150"],
  ["3", "CHEVROLET - ONIX 1.0 TURBO", "7891", "7655"],
  ["TOTAL GERAL", "", "250000", "240000"],
];

describe("parseFenabraveXlsx", () => {
  it("parses rows with position, name and units", () => {
    const result = parseFenabraveXlsx(buildWorkbook(sampleReport));
    expect(result.headerRow).toBe(3);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      position: 1,
      rawName: "VW - T-CROSS 1.0 TSI",
      units: 9432,
    });
    expect(result.rows[1]).toMatchObject({ position: 2, units: 9984 });
    expect(result.rows[2]).toMatchObject({ position: 3, units: 7891 });
  });

  it("skips total rows", () => {
    const result = parseFenabraveXlsx(buildWorkbook(sampleReport));
    expect(result.rows.every((r) => !/total/i.test(r.rawName))).toBe(true);
  });

  it("extracts reference label from header", () => {
    const result = parseFenabraveXlsx(buildWorkbook(sampleReport));
    expect(result.referenceLabel).toContain("2026");
  });

  it("warns when no rows recognized", () => {
    const empty = buildWorkbook([
      ["a", "b", "c"],
      ["x", "y", "z"],
    ]);
    const result = parseFenabraveXlsx(empty);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("stripBrandPrefix", () => {
  it("strips brand prefix", () => {
    expect(stripBrandPrefix("VW - T-CROSS 1.0 TSI")).toBe("T-CROSS 1.0 TSI");
    expect(stripBrandPrefix("FIAT - STRADA ENDURANCE 1.3")).toBe("STRADA ENDURANCE 1.3");
  });
});

describe("scoreMatch", () => {
  it("scores high for matching names", () => {
    expect(scoreMatch("T-Cross", "VW - T-CROSS 1.0 TSI")).toBeGreaterThan(0.5);
    expect(scoreMatch("Onix", "CHEVROLET - ONIX 1.0 TURBO")).toBeGreaterThan(0.5);
  });

  it("scores low for unrelated names", () => {
    expect(scoreMatch("Polo", "FIAT - STRADA ENDURANCE 1.3")).toBeLessThan(0.3);
  });
});

describe("bestMatch", () => {
  const candidates = [
    { modelYearId: 1, modelName: "T-Cross", brandName: "Volkswagen" },
    { modelYearId: 2, modelName: "Onix", brandName: "Chevrolet" },
    { modelYearId: 3, modelName: "Polo", brandName: "Volkswagen" },
  ];

  it("finds the best candidate above threshold", () => {
    const match = bestMatch("VW - T-CROSS 1.0 TSI", candidates);
    expect(match?.modelYearId).toBe(1);
    expect(match?.score).toBeGreaterThanOrEqual(0.55);
  });

  it("returns null for unmatched", () => {
    const match = bestMatch("LAMBORGHINI - HURACAN", candidates);
    expect(match).toBeNull();
  });
});
