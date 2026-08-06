CREATE TYPE "public"."admin_role" AS ENUM('admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'toggle_active', 'import', 'publish', 'ai_generate', 'login', 'logout');--> statement-breakpoint
CREATE TYPE "public"."editorial_locale" AS ENUM('pt-BR', 'en-US');--> statement-breakpoint
CREATE TYPE "public"."fuel_type" AS ENUM('gasoline', 'ethanol', 'flex', 'diesel', 'hybrid', 'hybrid_plug_in', 'electric', 'flex_hybrid');--> statement-breakpoint
CREATE TYPE "public"."spec_group" AS ENUM('price', 'engine', 'transmission', 'weight', 'steering', 'dimensions', 'consumption', 'suspension', 'brakes', 'warranty', 'accessories', 'comfort_technology', 'safety', 'sales');--> statement-breakpoint
CREATE TYPE "public"."vehicle_category" AS ENUM('hatch', 'sedan', 'suv', 'pickup', 'mpv', 'coupe', 'convertible', 'wagon', 'van', 'ev');--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"action" "audit_action" NOT NULL,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" integer,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(150),
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"logo_url" text,
	"origin_country" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editorial" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_year_id" integer NOT NULL,
	"locale" "editorial_locale" DEFAULT 'pt-BR' NOT NULL,
	"pros" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text,
	"rating" numeric(2, 1),
	"source_videos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"reviewed_by" integer,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fipe_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_year_id" integer NOT NULL,
	"reference_month" varchar(20) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_years" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"year" integer NOT NULL,
	"fuel_type" "fuel_type" DEFAULT 'flex' NOT NULL,
	"fipe_code" varchar(20),
	"is_zero_km" boolean DEFAULT false NOT NULL,
	"price_fipe" numeric(12, 2),
	"price_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"category" "vehicle_category",
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_year_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"units_sold" integer DEFAULT 0 NOT NULL,
	"ranking_position" integer,
	"source" varchar(100) DEFAULT 'FENABRAVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"unit" varchar(40),
	"display_order" integer DEFAULT 0 NOT NULL,
	"spec_group" "spec_group" DEFAULT 'engine' NOT NULL,
	"higher_is_better" boolean DEFAULT true NOT NULL,
	"is_numeric" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_year_id" integer NOT NULL,
	"spec_category_id" integer NOT NULL,
	"value" text,
	"numeric_value" numeric(14, 4),
	"display_value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial" ADD CONSTRAINT "editorial_model_year_id_model_years_id_fk" FOREIGN KEY ("model_year_id") REFERENCES "public"."model_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial" ADD CONSTRAINT "editorial_reviewed_by_admin_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fipe_history" ADD CONSTRAINT "fipe_history_model_year_id_model_years_id_fk" FOREIGN KEY ("model_year_id") REFERENCES "public"."model_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_years" ADD CONSTRAINT "model_years_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_rankings" ADD CONSTRAINT "sales_rankings_model_year_id_model_years_id_fk" FOREIGN KEY ("model_year_id") REFERENCES "public"."model_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_values" ADD CONSTRAINT "spec_values_model_year_id_model_years_id_fk" FOREIGN KEY ("model_year_id") REFERENCES "public"."model_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_values" ADD CONSTRAINT "spec_values_spec_category_id_spec_categories_id_fk" FOREIGN KEY ("spec_category_id") REFERENCES "public"."spec_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_admin_idx" ON "admin_audit_log" USING btree ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_idx" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "editorial_model_year_locale_idx" ON "editorial" USING btree ("model_year_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "fipe_history_model_year_reference_idx" ON "fipe_history" USING btree ("model_year_id","reference_month");--> statement-breakpoint
CREATE INDEX "fipe_history_model_year_idx" ON "fipe_history" USING btree ("model_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "model_years_model_year_fuel_idx" ON "model_years" USING btree ("model_id","year","fuel_type","is_zero_km");--> statement-breakpoint
CREATE INDEX "model_years_fipe_code_idx" ON "model_years" USING btree ("fipe_code");--> statement-breakpoint
CREATE UNIQUE INDEX "models_slug_idx" ON "models" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "models_brand_id_idx" ON "models" USING btree ("brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_rankings_model_year_month_idx" ON "sales_rankings" USING btree ("model_year_id","month","year");--> statement-breakpoint
CREATE INDEX "sales_rankings_month_year_idx" ON "sales_rankings" USING btree ("month","year");--> statement-breakpoint
CREATE UNIQUE INDEX "spec_categories_slug_idx" ON "spec_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "spec_values_model_year_category_idx" ON "spec_values" USING btree ("model_year_id","spec_category_id");