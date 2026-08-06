import { and, eq, gt } from "drizzle-orm";
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

/**
 * Import a FENABRAVE XLSX into sales_rankings.
 * Maps each row to the best catalog model year; rows below the match
 * threshold are reported as unmatched so the admin can review.
 */
export async function importFenabraveReport(buffer: ArrayBuffer): Promise<ImportOutcome> {
  const { rows, referenceLabel, warnings } = parseFenabraveXlsx(buffer);

  // Parse reference month/year from label ("Julho 2026")
  const monthMatch = /^([a-zà-ú]+)\s+(\d{4})$/i.exec(referenceLabel.trim());
  let month: number;
  let year: number;
  if (monthMatch) {
    const monthNames = [
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
    month = monthNames.findIndex((m) => m.startsWith(monthMatch[1].toLowerCase())) + 1;
    year = Number.parseInt(monthMatch[2], 10);
  } else {
    const now = new Date();
    month = now.getMonth() + 1;
    year = now.getFullYear();
  }

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
    const existing = await db
      .select()
      .from(salesRankings)
      .where(
        and(
          eq(salesRankings.modelYearId, match.modelYearId),
          eq(salesRankings.month, month),
          eq(salesRankings.year, year),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(salesRankings)
        .set({ unitsSold: row.units, rankingPosition: row.position, source: "FENABRAVE" })
        .where(eq(salesRankings.id, existing[0].id));
    } else {
      await db.insert(salesRankings).values({
        modelYearId: match.modelYearId,
        month,
        year,
        unitsSold: row.units,
        rankingPosition: row.position,
        source: "FENABRAVE",
      });
    }
    imported++;
  }

  return { totalRows: rows.length, imported, unmatched, warnings, referenceLabel };
}

export type { ParsedSaleRow };
