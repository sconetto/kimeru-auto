import { defineConfig } from "drizzle-kit";

/**
 * Migrations need a session-scoped connection: drizzle takes an advisory lock
 * and wraps each migration in a transaction, and `DO $$ ... $$` blocks do not
 * survive a transaction-mode pooler. Supabase exposes the unpooled endpoint as
 * `DIRECT_URL` (port 5432) while `DATABASE_URL` is usually the pooled one
 * (port 6543), so prefer the direct connection and only fall back to the pooled
 * URL for setups that define a single variable.
 */
const url =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/kimeru-auto";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
