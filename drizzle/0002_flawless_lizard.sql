ALTER TABLE "editorial" ADD COLUMN IF NOT EXISTS "score_breakdown" jsonb;--> statement-breakpoint
ALTER TABLE "editorial" ADD COLUMN IF NOT EXISTS "transcripts" jsonb DEFAULT '[]'::jsonb NOT NULL;
