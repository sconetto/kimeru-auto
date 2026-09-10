import * as XLSX from "@e965/xlsx";
import { describe, expect, it } from "vitest";
import { bestMatch, scoreMatch, stripBrandPrefix } from "@/lib/fenabrave/matcher";
import { parseFenabraveXlsx } from "@/lib/fenabrave/parser";
import { parseFenabravePdfText } from "@/lib/fenabrave/pdf-parser";

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

  it("rejects names with distinguishing leftover tokens", () => {
    expect(scoreMatch("Hilux", "TOYOTA/HILUX SW4")).toBe(0);
    expect(scoreMatch("Corolla", "TOYOTA/COROLLA CROSS")).toBe(0);
  });

  it("matches slash-format brand/model names", () => {
    expect(scoreMatch("Hilux", "TOYOTA/HILUX")).toBeGreaterThan(0.9);
    expect(scoreMatch("Omoda 5", "OMODA JAECOO/OMODA 5")).toBeGreaterThan(0.9);
  });
});

describe("bestMatch", () => {
  const candidates = [
    { modelId: 1, modelName: "T-Cross", brandName: "Volkswagen" },
    { modelId: 2, modelName: "Onix", brandName: "Chevrolet" },
    { modelId: 3, modelName: "Polo", brandName: "Volkswagen" },
  ];

  it("finds the best candidate above threshold", () => {
    const match = bestMatch("VW - T-CROSS 1.0 TSI", candidates);
    expect(match?.modelId).toBe(1);
    expect(match?.score).toBeGreaterThanOrEqual(0.55);
  });

  it("returns null for unmatched", () => {
    const match = bestMatch("LAMBORGHINI - HURACAN", candidates);
    expect(match).toBeNull();
  });
});

/** Sample of the real FENABRAVE PDF text layer (Aug/2026 ranking). */
const pdfSample = `
Ed. 284
Informativo - Emplacamentos
São Paulo, Setembro de 2026
Ranking dos emplacamentos em Agosto/2026
www.fenabrave.org.br 6
AUTOMÓVEIS
1º VW/POLO 10.472
2º VW/TERA 10.338
3º FIAT/ARGO 8.811
50º GAC/AION UT 979
COMERCIAIS LEVES
1º FIAT/STRADA 13.798
2º FIAT/TORO 5.707
50º FEVER/ORCA 18
Ed. 284
Informativo - Emplacamentos
São Paulo, Setembro de 2026
Ranking dos emplacamentos acumulados até Agosto/2026
www.fenabrave.org.br 7
AUTOMÓVEIS
1º VW/POLO 100.000
`;

describe("parseFenabravePdfText", () => {
  it("extracts the monthly ranking rows from the ranking section", () => {
    const result = parseFenabravePdfText(pdfSample);
    expect(result.rows).toHaveLength(7);
    expect(result.rows[0]).toMatchObject({ position: 1, rawName: "VW/POLO", units: 10472 });
    expect(result.rows[2]).toMatchObject({ position: 3, rawName: "FIAT/ARGO", units: 8811 });
    // Last commercial-leves row (position 50) is included.
    expect(result.rows[6]).toMatchObject({ position: 50, rawName: "FEVER/ORCA", units: 18 });
  });

  it("stops at the cumulative block, not merging it in", () => {
    const result = parseFenabravePdfText(pdfSample);
    // The cumulative block's 1º VW/POLO 100.000 must NOT appear.
    expect(result.rows.some((r) => r.units === 100000)).toBe(false);
  });

  it("infers month/year/referenceLabel from the header", () => {
    const result = parseFenabravePdfText(pdfSample);
    expect(result.month).toBe(8);
    expect(result.year).toBe(2026);
    expect(result.referenceLabel).toBe("Agosto 2026");
  });

  it("handles commas and dot-decimal units", () => {
    const sample =
      "Ranking dos emplacamentos em Julho/2026\nAUTOMÓVEIS\n1º GM/ONIX 7.635\n1º FIAT/ARGO 1.299\n";
    const result = parseFenabravePdfText(sample);
    expect(result.rows[0].units).toBe(7635);
    expect(result.rows[1].units).toBe(1299);
    expect(result.month).toBe(7);
    expect(result.year).toBe(2026);
  });

  it("returns empty rows when no ranking section present", () => {
    const result = parseFenabravePdfText("no ranking here\nfooter only");
    expect(result.rows).toHaveLength(0);
    expect(result.month).toBe(0);
  });
});
