import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database connection singleton.
 *
 * Uses postgres-js (lightweight, serverless-friendly) with a single
 * pooled connection. Falls back to a local development URL so the
 * app can boot without a DATABASE_URL set.
 */

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/kimeru-auto";

// In dev, reuse a single connection across hot reloads.
const globalForDb = globalThis as unknown as { __kimeruDb?: ReturnType<typeof createDb> };

function createDb() {
  const client = postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    prepare: false,
  });
  return drizzle(client, { schema });
}

export const db = globalForDb.__kimeruDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__kimeruDb = db;
}
