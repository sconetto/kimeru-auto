import { NextResponse } from "next/server";
import { getCompareOptions } from "@/lib/catalog/queries";

export const revalidate = 3600;

/** GET /api/catalog/compare-options — version-aware cascade tree for the comparison selector. */
export async function GET() {
  const options = await getCompareOptions().catch(() => []);
  return NextResponse.json({ brands: options });
}
