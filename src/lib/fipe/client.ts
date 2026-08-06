/**
 * FIPE API client — typed access to fipe.parallelum.com.br/api/v2.
 *
 * Data model (hierarchical):
 *   /cars/brands → /cars/brands/{brandId}/models → /cars/brands/{brandId}/models/{modelId}/years
 *   → /cars/brands/{brandId}/models/{modelId}/years/{yearId}
 *
 * Zero-km vehicles use year "32000" (e.g. "32000-1" = 0km gasoline).
 * Free tier: 500 req/day unauthenticated, 1000 with X-Subscription-Token.
 */

const BASE_URL = process.env.FIPE_API_BASE_URL ?? "https://fipe.parallelum.com.br/api/v2";
const API_TOKEN = process.env.FIPE_API_TOKEN;

export type FipeVehicleType = "cars" | "motorcycles" | "trucks";

export interface FipeBrand {
  code: string;
  name: string;
}

export interface FipeModel {
  code: string;
  name: string;
}

export interface FipeYear {
  code: string;
  name: string;
}

export interface FipePrice {
  price: string;
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  codeFipe: string;
  referenceMonth: string;
  vehicleType: number;
  fuelAcronym: string;
}

/** Parsed price — FIPE returns the value as a locale-formatted string. */
export interface FipePriceParsed {
  price: number;
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  fipeCode: string;
  referenceMonth: string;
  vehicleType: number;
  isZeroKm: boolean;
  yearCode?: string;
}

export class FipeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "FipeApiError";
  }
}

/** Parse "R$ 119.329,00" → 119329 (BRL). */
export function parseFipePrice(value: string): number {
  const cleaned = value
    .replace(/^R\$\s*/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed)) {
    throw new FipeApiError(`Could not parse FIPE price: "${value}"`, 500, "PARSE_ERROR");
  }
  return parsed;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(API_TOKEN ? { "X-Subscription-Token": API_TOKEN } : {}),
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers, next: { revalidate: 0 } });
  } catch (err) {
    throw new FipeApiError(`FIPE API unreachable: ${(err as Error).message}`, 503, "NETWORK");
  }

  if (response.status === 404) {
    throw new FipeApiError(`FIPE resource not found: ${path}`, 404, "NOT_FOUND");
  }
  if (response.status === 429) {
    throw new FipeApiError("FIPE API rate limit exceeded", 429, "RATE_LIMITED");
  }
  if (!response.ok) {
    throw new FipeApiError(`FIPE API error ${response.status}: ${path}`, response.status);
  }

  return (await response.json()) as T;
}

export const fipeClient = {
  /** List all brands for a vehicle type. */
  async getBrands(type: FipeVehicleType = "cars"): Promise<FipeBrand[]> {
    return request<FipeBrand[]>(`/${type}/brands`);
  },

  /** List models for a brand. */
  async getModels(brandId: number, type: FipeVehicleType = "cars"): Promise<FipeModel[]> {
    return request<FipeModel[]>(`/${type}/brands/${brandId}/models`);
  },

  /** List available years (including 0km via "32000") for a model. */
  async getYears(
    brandId: number,
    modelId: number,
    type: FipeVehicleType = "cars",
  ): Promise<FipeYear[]> {
    return request<FipeYear[]>(`/${type}/brands/${brandId}/models/${modelId}/years`);
  },

  /** Fetch the current price for a specific year variant. */
  async getPrice(
    brandId: number,
    modelId: number,
    yearId: string,
    type: FipeVehicleType = "cars",
  ): Promise<FipePriceParsed> {
    const raw = await request<FipePrice>(
      `/${type}/brands/${brandId}/models/${modelId}/years/${yearId}`,
    );
    return {
      price: parseFipePrice(raw.price),
      brand: raw.brand,
      model: raw.model,
      modelYear: raw.modelYear,
      fuel: raw.fuel,
      fipeCode: raw.codeFipe,
      referenceMonth: raw.referenceMonth,
      vehicleType: raw.vehicleType,
      isZeroKm: raw.modelYear === 32000,
    };
  },
};

/** Build the FIPE yearId for a model year + fuel. "32000" marks 0km. */
export function buildYearId(year: number, isZeroKm: boolean, fuelAcronym?: string): string {
  const base = isZeroKm ? 32000 : year;
  return fuelAcronym ? `${base}-${fuelAcronym}` : String(base);
}
