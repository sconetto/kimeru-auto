import { NextResponse } from "next/server";
import { FipeApiError } from "./client";

/**
 * Map a FIPE client failure onto an HTTP response for our own API routes so the
 * browser gets a usable status + code instead of a generic 500.
 */
export function fipeErrorResponse(err: unknown): NextResponse {
  if (err instanceof FipeApiError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
