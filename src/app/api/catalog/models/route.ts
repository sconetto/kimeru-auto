import { NextResponse } from "next/server";
import { getAllActiveModels } from "@/lib/catalog/queries";

export const revalidate = 3600;

/** GET /api/catalog/models — all active models for the comparison selector. */
export async function GET() {
  const models = await getAllActiveModels().catch(() => []);
  return NextResponse.json({ models });
}
