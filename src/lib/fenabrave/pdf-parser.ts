/**
 * FENABRAVE PDF parser (monthly "Informativo - Emplacamentos").
 *
 * FENABRAVE publishes the monthly registration report as a PDF on its portal
 * (https://www.fenabrave.org.br/portal/files/YYYY_MM_02.pdf). Unlike the older
 * XLSX exports, the PDF is a multi-page "Informativo" letter that contains many
 * sections (market share, cumulative, per-brand tables).
 *
 * We only need the machine-published model ranking — the section titled
 * "Ranking dos emplacamentos em <Mês>/<Ano>" — which lists AUTOMÓVEIS and
 * COMERCIAIS LEVES as lines shaped like:
 *
 *   1º VW/POLO 10.472
 *   2º VW/TERA 10.338
 *   ...
 *   50º GAC/AION UT 979
 *
 * The PDF has a real text layer (no OCR needed). We parse with `unpdf`
 * (PDF.js) and consume the "Ranking dos emplacamentos em ..." block, stopping
 * before the "acumulados" (cumulative) block.
 *
 * The importer reuses the same matching/upsert logic as the XLSX path.
 */

import { extractText, getDocumentProxy } from "unpdf";

/** Ranking row: `Nº MODEL UNITS` (e.g. "1º VW/POLO 10.472"). */
const RANKING_ROW_RE = /^(\d{1,3})º\s+(.+?)\s+([\d.,]+)$/;
/** Monthly ranking header: "Ranking dos emplacamentos em <Mês>/<Ano>". */
const RANKING_HEADER_RE = /^Ranking dos emplacamentos em\s+([A-Za-zÀ-ú]+)\s*\/\s*(\d{4})/i;
/** Stop marker: the cumulative block that follows the monthly one. */
const CUMULATIVE_RE = /Ranking dos emplacamentos acumulados/i;

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

function monthFromName(name: string): number {
  return MONTH_NAMES.findIndex((m) => m.startsWith(name.toLowerCase())) + 1;
}

/** Parse a Brazilian-formatted units value ("10.472" -> 10472). */
function parseUnits(raw: string): number {
  const cleaned = raw.replace(/\./g, "").replace(/,/g, "").trim();
  const n = Number.parseInt(cleaned, 10);
  return Number.isNaN(n) ? 0 : n;
}

export interface PdfRankingRow {
  position: number;
  rawName: string;
  units: number;
}

export interface PdfParseResult {
  rows: PdfRankingRow[];
  /** Human label like "Agosto 2026". */
  referenceLabel: string;
  /** 1-based month, or 0 if it could not be inferred. */
  month: number;
  year: number;
}

/**
 * Parse the extracted PDF text into the monthly model ranking rows.
 * Exported and pure so it can be unit-tested without a real PDF.
 */
export function parseFenabravePdfText(text: string): PdfParseResult {
  const lines = text.split(/\r?\n/);
  const rows: PdfRankingRow[] = [];
  let month = 0;
  let year = 0;
  let inRanking = false;

  for (const line of lines) {
    const header = line.match(RANKING_HEADER_RE);
    if (header) {
      // (Re)start on the monthly block; strip any rows from a preceding section.
      rows.length = 0;
      month = monthFromName(header[1]);
      year = Number.parseInt(header[2], 10);
      inRanking = true;
      continue;
    }

    // The cumulative block ends the monthly one — stop here.
    if (inRanking && CUMULATIVE_RE.test(line)) {
      inRanking = false;
      continue;
    }

    if (inRanking) {
      const row = line.match(RANKING_ROW_RE);
      if (row) {
        rows.push({
          position: Number.parseInt(row[1], 10),
          rawName: row[2].trim(),
          units: parseUnits(row[3]),
        });
      }
    }
  }

  const monthName = month > 0 ? MONTH_NAMES[month - 1] : "";
  const referenceLabel = year > 0 ? `${capitalize(monthName)} ${year}` : "";

  return { rows, referenceLabel, month, year };
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Fetch-free parser for a downloaded PDF buffer.
 * Returns the monthly model ranking rows; throws if no ranking is found.
 */
export async function parseFenabravePdf(buffer: ArrayBuffer): Promise<PdfParseResult> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  const joined = Array.isArray(text) ? text.join("\n") : text;

  const result = parseFenabravePdfText(joined);
  if (result.rows.length === 0) {
    throw new Error("Nenhuma linha de ranking reconhecida no PDF");
  }
  return result;
}
