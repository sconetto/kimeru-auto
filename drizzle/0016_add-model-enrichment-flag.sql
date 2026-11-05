-- Placeholder models for unmatched FENABRAVE rows.
--
-- The importer used to drop rows whose model name matched nothing in the
-- catalog, because `sales_rankings.model_id` is a non-null FK. Those are real
-- registrations (October 2026 lost 52 of 100 rows). Unmatched rows now create an
-- inactive placeholder model that owns the numbers until someone enriches it.
--
-- `is_active = false` already hides a model from the public catalog; this flag
-- distinguishes "auto-created, awaiting data" from "intentionally retired".
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "needs_enrichment" boolean DEFAULT false NOT NULL;

-- The enrichment queue filters on the flag and lists active ones first.
CREATE INDEX IF NOT EXISTS "models_needs_enrichment_idx" ON "models" ("needs_enrichment");

-- Every sales read is scoped to a (year, month) pair or a year; this covers both.
CREATE INDEX IF NOT EXISTS "sales_rankings_year_month_idx" ON "sales_rankings" ("year", "month");
