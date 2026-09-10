import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, models, salesRankings } from "@/lib/db/schema";
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
 * Core import: map parsed FENABRAVE rows to catalog model families and upsert
 * into sales_rankings (keyed by model_id + month + year).
 *
 * FENABRAVE reports each model family once per segment (automóveis vs
 * comerciais leves). A family can appear in both segments (e.g. RENAULT/KWID),
 * so rows are grouped by matched model, units summed, and the combined list is
 * re-ranked by units descending before writing.
 */
export async function importFenabraveRows(
  rows: ParsedSaleRow[],
  month: number,
  year: number,
): Promise<CoreImportOutcome> {
  // Candidate model families (active models, any brand)
  const candidates = await db
    .select({
      modelId: models.id,
      modelName: models.name,
      brandName: brands.name,
    })
    .from(models)
    .innerJoin(brands, eq(brands.id, models.brandId))
    .where(eq(models.isActive, true));

  const unmatched: { rawName: string; position: number }[] = [];
  const warnings: string[] = [];

  // Group rows by matched model family, summing units across segments.
  const byModel = new Map<number, { units: number; rawNames: string[] }>();
  for (const row of rows) {
    const match = bestMatch(row.rawName, candidates);
    if (!match) {
      unmatched.push({ rawName: row.rawName, position: row.position });
      continue;
    }
    const existing = byModel.get(match.modelId);
    if (existing) {
      existing.units += row.units;
      existing.rawNames.push(row.rawName);
    } else {
      byModel.set(match.modelId, { units: row.units, rawNames: [row.rawName] });
    }
  }

  // Combined ranking: sort by units desc, assign position 1..N.
  const ranked = [...byModel.entries()].sort((a, b) => b[1].units - a[1].units);
  let imported = 0;
  for (let i = 0; i < ranked.length; i++) {
    const [modelId, { units, rawNames }] = ranked[i];
    await db
      .insert(salesRankings)
      .values({
        modelId,
        month,
        year,
        unitsSold: units,
        rankingPosition: i + 1,
        source: "FENABRAVE",
      })
      .onConflictDoUpdate({
        target: [salesRankings.modelId, salesRankings.month, salesRankings.year],
        set: { unitsSold: units, rankingPosition: i + 1, source: "FENABRAVE" },
      });
    imported++;
    if (rawNames.length > 1) {
      warnings.push(`Somado entre segmentos: ${rawNames.join(" + ")}`);
    }
  }

  return { totalRows: rows.length, imported, unmatched, warnings };
}

/** Import a FENABRAVE XLSX (admin upload path). */
export async function importFenabraveReport(buffer: ArrayBuffer): Promise<ImportOutcome> {
  const { rows, referenceLabel, warnings } = parseFenabraveXlsx(buffer);
  const { month, year } = monthYearFromLabel(referenceLabel);

  const outcome = await importFenabraveRows(rows, month, year);
  return { ...outcome, warnings: [...warnings, ...outcome.warnings], referenceLabel };
}

export type { ParsedSaleRow };
