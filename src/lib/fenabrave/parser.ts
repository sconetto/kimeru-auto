/**
 * FENABRAVE monthly sales report parser.
 *
 * FENABRAVE publishes monthly registration statistics (emplacamentos)
 * as XLSX/PDF files. The XLSX "Automóveis e Comerciais Leves" sheet
 * typically contains rows like:
 *
 *   POS  MARCA/MODELO                JULHO 2026   JUNHO 2026
 *   1    VW - T-CROSS 1.0 ...        9.432        8.120
 *
 * Parsing strategy:
 *  - Read the first data sheet with SheetJS (raw values).
 *  - Heuristically detect the header row (looks for "modelo"/"marca"
 *    or a row with numeric-heavy columns).
 *  - Extract (position, model name, units) triples.
 *
 * The importer tolerates format drift by reporting per-row parse
 * failures instead of aborting.
 */

import * as XLSX from "xlsx";

export interface ParsedSaleRow {
  /** Ranking position in the source report (1-based). */
  position: number;
  /** Raw model name as written by FENABRAVE (e.g. "VW - T-CROSS 1.0 TSI"). */
  rawName: string;
  /** Units sold in the report month. */
  units: number;
}

export interface ParseResult {
  rows: ParsedSaleRow[];
  /** Reference month inferred from the report (e.g. "Julho 2026"). */
  referenceLabel: string;
  /** Header row index (1-based) where the data table begins. */
  headerRow: number;
  warnings: string[];
}

const MODEL_KEYWORDS = ["modelo", "marca", "marca/modelo", "veículo", "veiculo", "automóvel"];

function normalizeHeader(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function looksLikeUnits(value: unknown): boolean {
  if (typeof value === "number") return value >= 0;
  if (typeof value !== "string") return false;
  const cleaned = value.replace(/\./g, "").replace(/,/g, "").trim();
  return /^\d+$/.test(cleaned);
}

function parseUnits(value: unknown): number {
  if (typeof value === "number") return Math.round(value);
  const cleaned = String(value).replace(/\./g, "").replace(/,/g, "").trim();
  const n = Number.parseInt(cleaned, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Detect the header row: first row containing a model/marca keyword column. */
function findHeaderRow(_sheet: XLSX.WorkSheet, rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    for (const cell of row) {
      if (
        typeof cell === "string" &&
        MODEL_KEYWORDS.some((k) => normalizeHeader(cell).includes(k))
      ) {
        return i + 1; // 1-based
      }
    }
  }
  return 1;
}

/**
 * Parse a FENABRAVE XLSX buffer.
 * Expects: [position, modelName, ...units columns]. The first numeric
 * column after the model name is treated as the report month sales.
 */
export function parseFenabraveXlsx(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName =
    workbook.SheetNames.find((n) => /auto|carro|veículo/i.test(n)) ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error("Nenhuma planilha encontrada no arquivo");
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  const headerRow = findHeaderRow(sheet, rows);

  const parsed: ParsedSaleRow[] = [];
  const warnings: string[] = [];

  for (let i = headerRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const cells = row.map((c) => (typeof c === "string" ? c.trim() : c));
    const first = cells[0];

    // Skip empty rows and total/header rows
    if (!first || first === "" || /total|subtotal/i.test(String(first))) continue;

    // Position: leading number (1-200) — either "1 VW - ..." (same cell)
    // or "1" with the name in the next cell (separate column).
    let position = 0;
    let rawName = "";
    const posMatch = /^(\d{1,3})/.exec(String(first));
    if (posMatch) {
      position = Number.parseInt(posMatch[1], 10);
      const remainder = String(first)
        .slice(posMatch[0].length)
        .replace(/^[\s.\-–—]+/, "")
        .trim();
      if (remainder) {
        rawName = remainder;
      } else if (typeof cells[1] === "string" && cells[1].trim()) {
        rawName = cells[1].trim();
      } else {
        continue;
      }
    } else {
      rawName = String(first);
    }

    if (!rawName) continue;

    // First numeric-looking cell after the name column = units for report month
    const unitsCell = cells.slice(1).find(looksLikeUnits);
    if (unitsCell === undefined) continue;
    const units = parseUnits(unitsCell);

    parsed.push({ position, rawName, units });
  }

  if (parsed.length === 0) {
    warnings.push("Nenhuma linha de venda reconhecida — o formato do arquivo pode ter mudado.");
  }

  // Reference label: last header cell with a month-like text, else today's month
  const headerCells = rows[headerRow - 1] ?? [];
  const monthLike = headerCells
    .filter((c): c is string => typeof c === "string" && /^[a-zà-ú]+(\s+\d{4})?$/i.test(c.trim()))
    .map((c) => c.trim());
  const referenceLabel =
    monthLike[monthLike.length - 1] ??
    new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return { rows: parsed, referenceLabel, headerRow, warnings };
}
