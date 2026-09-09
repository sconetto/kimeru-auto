CREATE TYPE "public"."powertrain" AS ENUM('combustion', 'hybrid', 'electric');--> statement-breakpoint
ALTER TABLE "model_years" ADD COLUMN "powertrain" "powertrain";--> statement-breakpoint
UPDATE "model_years" SET "powertrain" = CASE
  WHEN "fuel_type" = 'electric' THEN 'electric'::"powertrain"
  WHEN "fuel_type" IN ('hybrid', 'hybrid_plug_in', 'flex_hybrid') THEN 'hybrid'::"powertrain"
  ELSE 'combustion'::"powertrain"
END;--> statement-breakpoint
ALTER TABLE "model_years" ALTER COLUMN "powertrain" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "model_years" ADD CONSTRAINT "model_years_powertrain_fuel_check" CHECK (
  ("fuel_type" IN ('gasoline', 'ethanol', 'flex', 'diesel') AND "powertrain" = 'combustion')
  OR ("fuel_type" IN ('hybrid', 'hybrid_plug_in', 'flex_hybrid') AND "powertrain" = 'hybrid')
  OR ("fuel_type" = 'electric' AND "powertrain" = 'electric')
);--> statement-breakpoint
ALTER TABLE "spec_categories" ADD COLUMN "applicable_fuel_types" "fuel_type"[];
