import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database connection singleton.
 *
 * Uses postgres-js (lightweight, serverless-friendly) with a single
 * pooled connection. Fails closed when DATABASE_URL is missing.
 */

function requireConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

const connectionString = requireConnectionString();

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
