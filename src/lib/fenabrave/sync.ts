import { hasFenabraveRows, importFenabraveRows } from "./importer";
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
 * Publication day is not fixed: the portal has answered 404 for a month whose
 * file already existed, and publishes late in some months. The workflow runs
 * daily from the 2nd to the 10th, and this script treats a 404 as "not
 * published yet" (not an error) so the window can keep retrying. Once the
 * deadline day is reached, a still-missing report becomes a real failure so it
 * is not silently skipped.
 *
 * We parse the model ranking, map names to catalog model years (reusing the
 * same matcher as the manual XLSX upload), and upsert into sales_rankings.
 * Run via cron: `npm run fenabrave:sync` (see .github/workflows/fenabrave-sync.yml).
 */

const BASE_URL = process.env.FENABRAVE_BASE_URL ?? "https://www.fenabrave.org.br/portal/files";
const USER_AGENT = "kimeru-auto/1.0 (FENABRAVE sync)";

/** Attempts per run for transient upstream failures (5xx, 429, network). */
const DOWNLOAD_ATTEMPTS = Math.max(1, Number(process.env.FENABRAVE_DOWNLOAD_ATTEMPTS ?? 3));

/** Base backoff between attempts; linear growth (2s, 4s, …). */
const RETRY_DELAY_MS = Math.max(0, Number(process.env.FENABRAVE_RETRY_DELAY_MS ?? 2000));

/** After this UTC day, an unpublished report is a failure rather than a wait. */
const PUBLISH_DEADLINE_DAY = Math.min(
  28,
  Math.max(1, Number(process.env.FENABRAVE_PUBLISH_DEADLINE_DAY ?? 10)),
);

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

/** Whether the caller pinned the month (backfill) rather than using "now". */
function hasExplicitTarget(): boolean {
  const month = Number.parseInt(process.env.FENABRAVE_MONTH ?? "", 10);
  const year = Number.parseInt(process.env.FENABRAVE_YEAR ?? "", 10);
  return Number.isFinite(month) && Number.isFinite(year);
}

/** Resolve target month/year: env override wins, else previous month. */
function resolveTarget(): MonthYear {
  if (hasExplicitTarget()) {
    return {
      month: Number.parseInt(process.env.FENABRAVE_MONTH as string, 10),
      year: Number.parseInt(process.env.FENABRAVE_YEAR as string, 10),
    };
  }
  return previousMonth();
}

export function buildReportUrl({ month, year }: MonthYear): string {
  const mm = String(month).padStart(2, "0");
  return `${BASE_URL}/${year}_${mm}_02.pdf`;
}

/**
 * How many filename variants to probe: plain, then " 2", " 3", …
 *
 * FENABRAVE's portal re-uploads a report as "<name> 2.pdf" when a file with the
 * same name already exists, so the plain name 404s while the month is actually
 * published. October 2026 shipped only as `2026_10_02 2.pdf`.
 */
const URL_VARIANTS = Math.max(1, Math.min(9, Number(process.env.FENABRAVE_URL_VARIANTS ?? 3)));

/** Candidate URLs for a month, most likely first. */
export function buildReportUrls(target: MonthYear): string[] {
  const canonical = buildReportUrl(target);
  const urls = [canonical];
  for (let copy = 2; copy <= URL_VARIANTS; copy++) {
    urls.push(canonical.replace(/\.pdf$/, `${encodeURIComponent(` ${copy}`)}.pdf`));
  }
  return urls;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Drizzle wraps driver errors: `.message` is just the SQL and the actionable
 * cause (e.g. "permission denied for table sales_rankings") sits on `.cause`.
 * Flatten both so a failed scheduled run can be diagnosed from the log alone.
 */
export function describeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const cause = (err as { cause?: unknown } | null)?.cause;
  const causeMessage =
    cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";
  return causeMessage && !message.includes(causeMessage) ? `${message} (${causeMessage})` : message;
}

type DownloadOutcome =
  | { kind: "ok"; response: Response; url: string }
  | { kind: "not-published"; message: string }
  | { kind: "error"; message: string };

/**
 * Fetch the report, trying each candidate filename in order.
 *
 * Within a candidate, only transient failures (5xx, 429, network) are retried.
 * A 404 means that filename is not there, so we move to the next variant rather
 * than treating the month as published-somewhere-else.
 */
async function downloadReport(urls: string[]): Promise<DownloadOutcome> {
  let lastMessage = `no attempt made for ${urls[0]}`;

  for (const url of urls) {
    let notFound = false;

    for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });

        if (response.ok) return { kind: "ok", response, url };

        if (response.status === 404) {
          lastMessage = `HTTP 404 for ${url}`;
          notFound = true;
          break;
        }

        lastMessage = `HTTP ${response.status} for ${url}`;
        const retryable = response.status >= 500 || response.status === 429;
        if (!retryable) return { kind: "error", message: `download: ${lastMessage}` };
      } catch (err) {
        lastMessage = (err as Error).message;
      }

      if (attempt < DOWNLOAD_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
    }

    // A healthy portal that keeps failing will not be fixed by another filename.
    if (!notFound) {
      return {
        kind: "error",
        message: `download: ${lastMessage} (after ${DOWNLOAD_ATTEMPTS} attempts)`,
      };
    }
  }

  return { kind: "not-published", message: lastMessage };
}

export interface SyncResult {
  url: string;
  referenceLabel: string;
  totalRows: number;
  imported: number;
  unmatched: { rawName: string; position: number }[];
  errors: string[];
  /** The month's PDF is not on the portal yet (expected during the window). */
  notPublished: boolean;
  /** The month was already ingested, so this run did nothing. */
  skipped: boolean;
}

export async function syncFenabraveReport(): Promise<SyncResult> {
  const result: SyncResult = {
    url: "",
    referenceLabel: "",
    totalRows: 0,
    imported: 0,
    unmatched: [],
    errors: [],
    notPublished: false,
    skipped: false,
  };

  const target = resolveTarget();
  const urls = buildReportUrls(target);
  const url = urls[0];

  // Repeat runs during the publication window must not re-download or re-parse.
  try {
    if (await hasFenabraveRows(target.month, target.year)) {
      result.url = url;
      result.skipped = true;
      result.referenceLabel = `${target.month}/${target.year} already ingested`;
      return result;
    }
  } catch (err) {
    result.errors.push(`lookup:${describeError(err)}`);
    return result;
  }

  const download = await downloadReport(urls);

  if (download.kind === "not-published") {
    result.url = url;
    result.notPublished = true;
    // Once the window closes, keep failing so the workflow opens an issue.
    const dueForDeadline = new Date().getUTCDate() >= PUBLISH_DEADLINE_DAY;
    if (!hasExplicitTarget() && dueForDeadline) {
      result.errors.push(
        `download: report still missing after the day-${PUBLISH_DEADLINE_DAY} deadline (tried ${urls.length} filename variants)`,
      );
    }
    return result;
  }

  if (download.kind === "error") {
    result.url = url;
    result.errors.push(download.message);
    return result;
  }

  // Report the filename that actually worked (may be a " 2" duplicate upload).
  result.url = download.url;

  let parsed: PdfParseResult;
  try {
    const buffer = await download.response.arrayBuffer();
    parsed = await parseFenabravePdf(buffer);
  } catch (err) {
    result.errors.push(`parse:${describeError(err)}`);
    return result;
  }

  result.referenceLabel = parsed.referenceLabel;

  try {
    const outcome = await importFenabraveRows(parsed.rows, parsed.month, parsed.year);
    result.totalRows = outcome.totalRows;
    result.imported = outcome.imported;
    result.unmatched = outcome.unmatched;
  } catch (err) {
    result.errors.push(`import:${describeError(err)}`);
  }

  return result;
}

/** CLI entrypoint — `npm run fenabrave:sync`. */
if (import.meta.url === `file://${process.argv[1]}`) {
  syncFenabraveReport()
    .then((r) => {
      if (r.skipped) {
        console.log(`FENABRAVE sync: ${r.referenceLabel}, nothing to do`);
        process.exit(0);
      }
      if (r.notPublished) {
        console.log(`FENABRAVE sync: report not published yet (${r.url})`);
      } else {
        console.log(
          `FENABRAVE sync (${r.referenceLabel || r.url}): ${r.imported}/${r.totalRows} imported, ${r.unmatched.length} unmatched`,
        );
        if (r.unmatched.length > 0) {
          console.warn(`Unmatched (${r.unmatched.length}):`, r.unmatched.slice(0, 10));
        }
      }
      if (r.errors.length > 0) console.error("Errors:", r.errors);
      process.exit(r.errors.length > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("FENABRAVE sync failed:", err);
      process.exit(1);
    });
}
