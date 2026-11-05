import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, models, salesRankings } from "@/lib/db/schema";
import { bestMatch } from "./matcher";
import { type ParsedSaleRow, parseFenabraveXlsx } from "./parser";
import { createPlaceholderResolver } from "./placeholder";

export interface ImportOutcome {
  totalRows: number;
  imported: number;
  unmatched: { rawName: string; position: number }[];
  warnings: string[];
  referenceLabel: string;
  /** Row-level accounting so a partial import is never reported as a plain ratio. */
  coverage: { total: number; matched: number; created: number; unmatched: number };
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
 * Whether a month has already been ingested. The sync runs daily during the
 * publication window, so this keeps repeat runs cheap and free of re-parsing.
 */
export async function hasFenabraveRows(month: number, year: number): Promise<boolean> {
  const [row] = await db
    .select({ id: salesRankings.id })
    .from(salesRankings)
    .where(and(eq(salesRankings.month, month), eq(salesRankings.year, year)))
    .limit(1);
  return Boolean(row);
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
  const createPlaceholders = process.env.FENABRAVE_CREATE_PLACEHOLDERS !== "false";

  // Active models first so a matcher tie favours an enriched record over an
  // auto-created placeholder of the same name.
  const candidates = await db
    .select({
      modelId: models.id,
      modelName: models.name,
      brandName: brands.name,
    })
    .from(models)
    .innerJoin(brands, eq(brands.id, models.brandId))
    .where(or(eq(models.isActive, true), eq(models.needsEnrichment, true)))
    .orderBy(desc(models.isActive));

  const unmatched: { rawName: string; position: number }[] = [];
  const warnings: string[] = [];
  const resolver = createPlaceholderResolver();
  let matchedRows = 0;
  let createdRows = 0;

  // Group rows by matched model family, summing units across segments.
  const byModel = new Map<number, { units: number; rawNames: string[] }>();
  for (const row of rows) {
    const match = bestMatch(row.rawName, candidates);
    let modelId: number | null = match?.modelId ?? null;

    if (modelId === null) {
      // No catalog model: keep the numbers by attaching them to a placeholder
      // instead of dropping the row.
      if (!createPlaceholders) {
        unmatched.push({ rawName: row.rawName, position: row.position });
        continue;
      }

      const resolution = await resolver.resolve(row.rawName);
      if (!resolution) {
        unmatched.push({ rawName: row.rawName, position: row.position });
        continue;
      }

      modelId = resolution.modelId;
      if (resolution.created) {
        createdRows++;
        warnings.push(`Placeholder criado: ${row.rawName}`);
      } else {
        matchedRows++;
      }
    } else {
      matchedRows++;
    }

    const existing = byModel.get(modelId);
    if (existing) {
      existing.units += row.units;
      existing.rawNames.push(row.rawName);
    } else {
      byModel.set(modelId, { units: row.units, rawNames: [row.rawName] });
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

  return {
    totalRows: rows.length,
    imported,
    unmatched,
    warnings,
    coverage: {
      total: rows.length,
      matched: matchedRows,
      created: createdRows,
      unmatched: unmatched.length,
    },
  };
}

/** Import a FENABRAVE XLSX (admin upload path). */
export async function importFenabraveReport(buffer: ArrayBuffer): Promise<ImportOutcome> {
  const { rows, referenceLabel, warnings } = parseFenabraveXlsx(buffer);
  const { month, year } = monthYearFromLabel(referenceLabel);

  const outcome = await importFenabraveRows(rows, month, year);
  return { ...outcome, warnings: [...warnings, ...outcome.warnings], referenceLabel };
}

export type { ParsedSaleRow };
