CREATE TABLE "model_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "model_versions" ADD CONSTRAINT "model_versions_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "model_versions_model_slug_idx" ON "model_versions" USING btree ("model_id","slug");--> statement-breakpoint
CREATE INDEX "model_versions_model_idx" ON "model_versions" USING btree ("model_id");--> statement-breakpoint
ALTER TABLE "sales_rankings" ADD COLUMN "model_id" integer;--> statement-breakpoint
UPDATE "sales_rankings" sr SET "model_id" = my."model_id" FROM "model_years" my WHERE my."id" = sr."model_year_id";--> statement-breakpoint
DELETE FROM "sales_rankings" a USING "sales_rankings" b
	WHERE a."model_id" = b."model_id"
	AND a."month" = b."month"
	AND a."year" = b."year"
	AND (a."units_sold" < b."units_sold" OR (a."units_sold" = b."units_sold" AND a."id" > b."id"));--> statement-breakpoint
ALTER TABLE "sales_rankings" ALTER COLUMN "model_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_rankings" DROP CONSTRAINT "sales_rankings_model_year_id_model_years_id_fk";--> statement-breakpoint
ALTER TABLE "sales_rankings" ADD CONSTRAINT "sales_rankings_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
DROP INDEX "sales_rankings_model_year_month_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "sales_rankings_model_month_year_idx" ON "sales_rankings" USING btree ("model_id","month","year");--> statement-breakpoint
ALTER TABLE "sales_rankings" DROP COLUMN "model_year_id";
