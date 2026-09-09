import { importFenabraveRows } from "./importer";
import { type PdfParseResult, parseFenabravePdf } from "./pdf-parser";

/**
 * Monthly FENABRAVE sync job (PDF → sales_rankings).
 *
 * FENABRAVE publishes the monthly registration report as a PDF on its portal:
 *
 *   https://www.fenabrave.org.br/portal/files/YYYY_MM_02.pdf
 *
 * The `_02` file (month M) is published early in month M+1, so by default we
 * fetch the *previous* month (the report is "Arquivo do mês M" published in
 * M+1). Override with FENABRAVE_MONTH / FENABRAVE_YEAR env vars to backfill.
 *
 * We parse the model ranking, map names to catalog model years (reusing the
 * same matcher as the manual XLSX upload), and upsert into sales_rankings.
 * Run via cron: `npm run fenabrave:sync` (see .github/workflows/fenabrave-sync.yml).
 */

const BASE_URL = process.env.FENABRAVE_BASE_URL ?? "https://www.fenabrave.org.br/portal/files";

interface MonthYear {
  month: number;
  year: number;
}

/** Previous calendar month (FENABRAVE publishes month M in M+1). */
function previousMonth(): MonthYear {
  const now = new Date();
  let month = now.getMonth() + 1; // 1-based
  let year = now.getFullYear();
  if (month === 1) {
    month = 12;
    year -= 1;
  } else {
    month -= 1;
  }
  return { month, year };
}

/** Resolve target month/year: env override wins, else previous month. */
function resolveTarget(): MonthYear {
  const envMonth = Number.parseInt(process.env.FENABRAVE_MONTH ?? "", 10);
  const envYear = Number.parseInt(process.env.FENABRAVE_YEAR ?? "", 10);
  if (Number.isFinite(envMonth) && envMonth >= 1 && envMonth <= 12 && Number.isFinite(envYear)) {
    return { month: envMonth, year: envYear };
  }
  return previousMonth();
}

function buildUrl({ month, year }: MonthYear): string {
  const mm = String(month).padStart(2, "0");
  return `${BASE_URL}/${year}_${mm}_02.pdf`;
}

export interface SyncResult {
  url: string;
  referenceLabel: string;
  totalRows: number;
  imported: number;
  unmatched: { rawName: string; position: number }[];
  errors: string[];
}

export async function syncFenabraveReport(): Promise<SyncResult> {
  const result: SyncResult = {
    url: "",
    referenceLabel: "",
    totalRows: 0,
    imported: 0,
    unmatched: [],
    errors: [],
  };

  const target = resolveTarget();
  const url = buildUrl(target);

  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": "kimeru-auto/1.0 (FENABRAVE sync)" } });
  } catch (err) {
    result.errors.push(`download:${(err as Error).message}`);
    return result;
  }

  if (!res.ok) {
    result.errors.push(`download: HTTP ${res.status} for ${url}`);
    return result;
  }

  result.url = url;

  let parsed: PdfParseResult;
  try {
    const buffer = await res.arrayBuffer();
    parsed = await parseFenabravePdf(buffer);
  } catch (err) {
    result.errors.push(`parse:${(err as Error).message}`);
    return result;
  }

  result.referenceLabel = parsed.referenceLabel;

  try {
    const outcome = await importFenabraveRows(parsed.rows, parsed.month, parsed.year);
    result.totalRows = outcome.totalRows;
    result.imported = outcome.imported;
    result.unmatched = outcome.unmatched;
  } catch (err) {
    result.errors.push(`import:${(err as Error).message}`);
  }

  return result;
}

/** CLI entrypoint — `npm run fenabrave:sync`. */
if (import.meta.url === `file://${process.argv[1]}`) {
  syncFenabraveReport()
    .then((r) => {
      console.log(
        `FENABRAVE sync (${r.referenceLabel || r.url}): ${r.imported}/${r.totalRows} imported, ${r.unmatched.length} unmatched`,
      );
      if (r.unmatched.length > 0) {
        console.warn(`Unmatched (${r.unmatched.length}):`, r.unmatched.slice(0, 10));
      }
      if (r.errors.length > 0) console.error("Errors:", r.errors);
      process.exit(r.errors.length > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("FENABRAVE sync failed:", err);
      process.exit(1);
    });
}
