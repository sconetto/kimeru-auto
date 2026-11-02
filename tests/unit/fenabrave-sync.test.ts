import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockHasRows = vi.fn();
const mockImportRows = vi.fn();
const mockParsePdf = vi.fn();

vi.mock("@/lib/fenabrave/importer", () => ({
  hasFenabraveRows: (...args: unknown[]) => mockHasRows(...args),
  importFenabraveRows: (...args: unknown[]) => mockImportRows(...args),
}));

vi.mock("@/lib/fenabrave/pdf-parser", () => ({
  parseFenabravePdf: (...args: unknown[]) => mockParsePdf(...args),
}));

/** Import the module fresh so module-level env constants pick up stubs. */
async function loadSync(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("@/lib/fenabrave/sync");
}

const okResponse = () => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => new ArrayBuffer(0),
});

const statusResponse = (status: number) => ({ ok: false, status });

function stubFetch(...responses: unknown[]) {
  const mock = vi.fn();
  for (const response of responses) {
    if (response instanceof Error) mock.mockRejectedValueOnce(response);
    else mock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal("fetch", mock);
  return mock;
}

beforeEach(() => {
  mockHasRows.mockReset().mockResolvedValue(false);
  mockImportRows.mockReset().mockResolvedValue({
    totalRows: 3,
    imported: 3,
    unmatched: [],
    warnings: [],
  });
  mockParsePdf.mockReset().mockResolvedValue({
    referenceLabel: "Setembro 2026",
    month: 9,
    year: 2026,
    rows: [],
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("syncFenabraveReport", () => {
  it("treats a 404 as 'not published yet' rather than a failure", async () => {
    const sync = await loadSync({ FENABRAVE_RETRY_DELAY_MS: "0" });
    const fetchMock = stubFetch(statusResponse(404));

    const result = await sync.syncFenabraveReport();

    expect(result.notPublished).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.imported).toBe(0);
    // A missing report is not retried: it will not appear within this run.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a transient 5xx and then imports", async () => {
    const sync = await loadSync({ FENABRAVE_RETRY_DELAY_MS: "0" });
    const fetchMock = stubFetch(statusResponse(503), okResponse());

    const result = await sync.syncFenabraveReport();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.errors).toEqual([]);
    expect(result.imported).toBe(3);
    expect(result.referenceLabel).toBe("Setembro 2026");
  });

  it("retries a network error", async () => {
    const sync = await loadSync({ FENABRAVE_RETRY_DELAY_MS: "0" });
    const fetchMock = stubFetch(new Error("ECONNRESET"), okResponse());

    const result = await sync.syncFenabraveReport();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.errors).toEqual([]);
  });

  it("gives up after the configured attempts when the portal keeps failing", async () => {
    const sync = await loadSync({ FENABRAVE_RETRY_DELAY_MS: "0" });
    const fetchMock = stubFetch(
      statusResponse(500),
      statusResponse(500),
      statusResponse(500),
      statusResponse(500),
    );

    const result = await sync.syncFenabraveReport();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("after 3 attempts");
  });

  it("does not retry a non-retryable status", async () => {
    const sync = await loadSync({ FENABRAVE_RETRY_DELAY_MS: "0" });
    const fetchMock = stubFetch(statusResponse(403));

    const result = await sync.syncFenabraveReport();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.errors[0]).toContain("HTTP 403");
  });

  it("skips the download when the month was already ingested", async () => {
    const sync = await loadSync({ FENABRAVE_RETRY_DELAY_MS: "0" });
    mockHasRows.mockResolvedValue(true);
    const fetchMock = stubFetch(okResponse());

    const result = await sync.syncFenabraveReport();

    expect(result.skipped).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails once the publication deadline passes with no report", async () => {
    const sync = await loadSync({
      FENABRAVE_RETRY_DELAY_MS: "0",
      FENABRAVE_PUBLISH_DEADLINE_DAY: "1",
    });
    stubFetch(statusResponse(404));

    const result = await sync.syncFenabraveReport();

    expect(result.notPublished).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("deadline");
  });

  it("does not apply the deadline to an explicit backfill target", async () => {
    const sync = await loadSync({
      FENABRAVE_RETRY_DELAY_MS: "0",
      FENABRAVE_PUBLISH_DEADLINE_DAY: "1",
      FENABRAVE_MONTH: "9",
      FENABRAVE_YEAR: "2026",
    });
    stubFetch(statusResponse(404));

    const result = await sync.syncFenabraveReport();

    expect(result.notPublished).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.url).toContain("2026_09_02.pdf");
  });
});
