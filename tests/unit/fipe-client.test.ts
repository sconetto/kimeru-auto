import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildYearId, FipeApiError, fipeClient, parseFipePrice } from "@/lib/fipe/client";

describe("parseFipePrice", () => {
  it("parses 'R$ 119.329,00' → 119329", () => {
    expect(parseFipePrice("R$ 119.329,00")).toBe(119329);
  });

  it("parses 'R$ 45.255,00' → 45255", () => {
    expect(parseFipePrice("R$ 45.255,00")).toBe(45255);
  });

  it("handles values without thousand separators", () => {
    expect(parseFipePrice("R$ 9.000,50")).toBe(9000.5);
  });

  it("throws on unparseable input", () => {
    expect(() => parseFipePrice("free")).toThrow(FipeApiError);
  });
});

describe("buildYearId", () => {
  it("builds used year with fuel acronym", () => {
    expect(buildYearId(2025, false, "1")).toBe("2025-1");
  });

  it("builds 0km year code", () => {
    expect(buildYearId(2025, true, "1")).toBe("32000-1");
  });

  it("builds year without fuel acronym", () => {
    expect(buildYearId(2024, false)).toBe("2024");
  });
});

describe("fipeClient", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and maps a price response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          price: "R$ 45.255,00",
          brand: "Fiat",
          model: "MOBI DRIVE 1.0 Flex 6V 5p",
          modelYear: 2020,
          fuel: "Flex",
          codeFipe: "001480-0",
          referenceMonth: "agosto de 2026",
          vehicleType: 1,
          fuelAcronym: "F",
        }),
        { status: 200 },
      ),
    );

    const price = await fipeClient.getPrice(21, 7825, "2020-5");
    expect(price.price).toBe(45255);
    expect(price.fipeCode).toBe("001480-0");
    expect(price.isZeroKm).toBe(false);
    expect(price.referenceMonth).toBe("agosto de 2026");
  });

  it("maps 0km vehicles (modelYear 32000)", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          price: "R$ 108.030,00",
          brand: "Hyundai",
          model: "HB20 1.0 TURBO",
          modelYear: 32000,
          fuel: "Flex",
          codeFipe: "015246-3",
          referenceMonth: "agosto de 2026",
          vehicleType: 1,
          fuelAcronym: "F",
        }),
        { status: 200 },
      ),
    );

    const price = await fipeClient.getPrice(23, 7825, "32000-1");
    expect(price.isZeroKm).toBe(true);
  });

  it("throws FipeApiError with NOT_FOUND on 404", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Not found", { status: 404 }));
    await expect(fipeClient.getPrice(1, 2, "2020-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });

  it("throws FipeApiError with RATE_LIMITED on 429", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Rate limited", { status: 429 }));
    await expect(fipeClient.getPrice(1, 2, "2020-1")).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });
});
