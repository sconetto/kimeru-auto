import { eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, models, modelYears, salesRankings } from "@/lib/db/schema";
import { bestMatch } from "./matcher";
import { type ParsedSaleRow, parseFenabraveXlsx } from "./parser";

export interface ImportOutcome {
  totalRows: number;
  imported: number;
  unmatched: { rawName: string; position: number }[];
  warnings: string[];
  referenceLabel: string;
}

/** ImportOutcome without the referenceLabel (for the row-level core). */
export type CoreImportOutcome = Omit<ImportOutcome, "referenceLabel">;

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Parse a "Julho 2026" label into { month, year }, defaulting to now. */
export function monthYearFromLabel(label: string): { month: number; year: number } {
  const match = /^([a-zà-ú]+)\s+(\d{4})$/i.exec(label.trim());
  if (match) {
    const month = MONTH_NAMES.findIndex((m) => m.startsWith(match[1].toLowerCase())) + 1;
    const year = Number.parseInt(match[2], 10);
    if (month > 0) return { month, year };
  }
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/**
 * Core import: map parsed rows to the best catalog model year and upsert into
 * sales_rankings (keyed by model_year_id + month + year). Rows below the match
 * threshold are reported as unmatched so the admin can review.
 *
 * Shared by both the XLSX admin upload and the automated PDF sync.
 */
export async function importFenabraveRows(
  rows: ParsedSaleRow[],
  month: number,
  year: number,
): Promise<CoreImportOutcome> {
  // Load all candidate model years for matching (recent years, any fuel/0km state)
  const candidates = await db
    .select({
      modelYearId: modelYears.id,
      modelName: models.name,
      brandName: brands.name,
      modelYear: modelYears.year,
    })
    .from(modelYears)
    .innerJoin(models, eq(models.id, modelYears.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .where(gt(modelYears.year, year - 6));

  const unmatched: { rawName: string; position: number }[] = [];
  let imported = 0;

  for (const row of rows) {
    const match = bestMatch(row.rawName, candidates);
    if (!match) {
      unmatched.push({ rawName: row.rawName, position: row.position });
      continue;
    }

    // Upsert (model_year_id, month, year)
    await db
      .insert(salesRankings)
      .values({
        modelYearId: match.modelYearId,
        month,
        year,
        unitsSold: row.units,
        rankingPosition: row.position,
        source: "FENABRAVE",
      })
      .onConflictDoUpdate({
        target: [salesRankings.modelYearId, salesRankings.month, salesRankings.year],
        set: { unitsSold: row.units, rankingPosition: row.position, source: "FENABRAVE" },
      });
    imported++;
  }

  return { totalRows: rows.length, imported, unmatched, warnings: [] };
}

/** Import a FENABRAVE XLSX (admin upload path). */
export async function importFenabraveReport(buffer: ArrayBuffer): Promise<ImportOutcome> {
  const { rows, referenceLabel, warnings } = parseFenabraveXlsx(buffer);
  const { month, year } = monthYearFromLabel(referenceLabel);

  const outcome = await importFenabraveRows(rows, month, year);
  return { ...outcome, warnings, referenceLabel };
}

export type { ParsedSaleRow };
