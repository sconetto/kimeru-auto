ALTER TABLE "editorial" ADD COLUMN "score_breakdown" jsonb;--> statement-breakpoint
ALTER TABLE "editorial" ADD COLUMN "transcripts" jsonb DEFAULT '[]'::jsonb NOT NULL;