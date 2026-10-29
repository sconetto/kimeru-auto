import { defineConfig } from "drizzle-kit";

/**
 * Migrations run over `DATABASE_URL` (Supabase Supavisor, port 6543) on purpose.
 *
 * The unpooled `DIRECT_URL` (db.<ref>.supabase.co, port 5432) resolves to an
 * IPv6-only address for this project, and Vercel build machines are IPv4-only,
 * so pointing drizzle at it makes `drizzle-kit migrate` hang until the build
 * fails. The pooler accepts the advisory lock and per-migration transaction
 * drizzle needs, so it is the correct endpoint here.
 */
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/kimeru-auto",
  },
  verbose: true,
  strict: true,
});
