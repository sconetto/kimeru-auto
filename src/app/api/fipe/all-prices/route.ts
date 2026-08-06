import { NextResponse } from "next/server";
import { parseFipePrice } from "@/lib/fipe/client";

const BASE_URL = process.env.FIPE_API_BASE_URL ?? "https://fipe.parallelum.com.br/api/v2";
const API_TOKEN = process.env.FIPE_API_TOKEN;

interface FipeYearRaw {
  code: string;
  name: string;
}

interface FipePriceRaw {
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

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_TOKEN) headers["X-Subscription-Token"] = API_TOKEN;
  return headers;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const modelId = searchParams.get("modelId");

  if (!brandId || !modelId) {
    return NextResponse.json({ error: "brandId and modelId are required" }, { status: 400 });
  }

  const base = `${BASE_URL}/cars/brands/${brandId}/models/${modelId}`;

  try {
    // Fetch all years
    const yearsRes = await fetch(`${base}/years`, { headers: authHeaders() });
    if (!yearsRes.ok) {
      return NextResponse.json({ error: "Failed to fetch years from FIPE" }, { status: 502 });
    }
    const years: FipeYearRaw[] = await yearsRes.json();

    // Fetch all prices in parallel (server-side — only 1 browser-to-server call)
    const prices = await Promise.all(
      years.map(async (y) => {
        try {
          const res = await fetch(`${base}/years/${y.code}`, { headers: authHeaders() });
          if (!res.ok) return null;
          const raw: FipePriceRaw = await res.json();
          return {
            yearCode: y.code,
            modelYear: raw.modelYear,
            fuel: raw.fuel,
            price: parseFipePrice(raw.price),
            isZeroKm: y.code.startsWith("32000"),
            referenceMonth: raw.referenceMonth,
            fipeCode: raw.codeFipe,
          };
        } catch {
          return null;
        }
      }),
    );

    const valid = prices.filter(Boolean);
    return NextResponse.json({ prices: valid });
  } catch {
    return NextResponse.json({ error: "FIPE API unavailable" }, { status: 502 });
  }
}
