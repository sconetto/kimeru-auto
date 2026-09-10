ALTER TABLE "model_years" ADD COLUMN "model_version_id" integer;--> statement-breakpoint

-- Create one initial version for every existing model (preserves every model's
-- identity as a single-version family before the MG4 consolidation below).
INSERT INTO "model_versions" ("model_id", "name", "slug", "image_url", "is_active", "created_at", "updated_at")
SELECT "id", "name", "slug", "image_url", "is_active", "created_at", "updated_at"
FROM "models";--> statement-breakpoint

UPDATE "model_years" AS my
SET "model_version_id" = mv."id"
FROM "model_versions" AS mv
WHERE mv."model_id" = my."model_id";--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "model_years" WHERE "model_version_id" IS NULL) THEN
    RAISE EXCEPTION 'Some model_years could not be mapped to a version';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "model_years" ALTER COLUMN "model_version_id" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "model_years" ADD CONSTRAINT "model_years_model_version_id_model_versions_id_fk" FOREIGN KEY ("model_version_id") REFERENCES "public"."model_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "model_years_version_year_fuel_idx" ON "model_years" USING btree ("model_version_id","year","fuel_type","is_zero_km");--> statement-breakpoint

CREATE INDEX "model_years_version_price_updated_idx" ON "model_years" USING btree ("model_version_id","price_updated_at");--> statement-breakpoint

-- Guarded MG4 consolidation: models 6,7,9 are three versions of one family.
DO $$
DECLARE
  matching_models integer;
BEGIN
  SELECT count(*)
  INTO matching_models
  FROM "models"
  WHERE
    (id = 6 AND name = 'MG4 Urban Comfort (43 kWh)')
    OR (id = 7 AND name = 'MG4 Urban Luxury (43 kWh)')
    OR (id = 9 AND name = 'MG4 Urban Luxury (54 kWh)')
    OR (id = 10 AND name = 'Uni-T');

  IF matching_models NOT IN (0, 4) THEN
    RAISE EXCEPTION 'Production model IDs/names differ from migration assumptions';
  END IF;

  IF matching_models = 4 THEN
    IF (SELECT count(DISTINCT brand_id) FROM "models" WHERE id IN (6, 7, 9)) <> 1 THEN
      RAISE EXCEPTION 'MG4 source models do not belong to one brand';
    END IF;

    IF EXISTS (SELECT 1 FROM "models" WHERE slug = 'mg4-urban' AND id <> 6) THEN
      RAISE EXCEPTION 'models.slug mg4-urban is already occupied';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "model_years" WHERE model_id = 6 AND fipe_code = '076010-2')
      OR NOT EXISTS (SELECT 1 FROM "model_years" WHERE model_id = 7 AND fipe_code = '076009-9')
      OR NOT EXISTS (SELECT 1 FROM "model_years" WHERE model_id = 9 AND fipe_code = '076011-0')
      OR NOT EXISTS (SELECT 1 FROM "model_years" WHERE model_id = 10 AND fipe_code = '308001-3') THEN
      RAISE EXCEPTION 'Expected model-year/FIPE mapping was not found';
    END IF;

    IF EXISTS (
      SELECT month, year
      FROM "sales_rankings"
      WHERE model_id IN (6, 7, 9)
      GROUP BY month, year
      HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION 'Conflicting MG4 sales rows require manual reconciliation';
    END IF;

    UPDATE "sales_rankings" SET model_id = 6 WHERE model_id IN (7, 9);

    UPDATE "vehicle_images" SET is_cover = false
    WHERE model_id IN (7, 9) AND is_cover = true;

    UPDATE "vehicle_images" SET model_id = 6 WHERE model_id IN (7, 9);

    UPDATE "model_versions"
    SET
      model_id = 6,
      name = CASE model_id
        WHEN 6 THEN 'Comfort 43 kWh'
        WHEN 7 THEN 'Luxury 43 kWh'
        WHEN 9 THEN 'Luxury 54 kWh'
      END,
      slug = CASE model_id
        WHEN 6 THEN 'comfort-43-kwh'
        WHEN 7 THEN 'luxury-43-kwh'
        WHEN 9 THEN 'luxury-54-kwh'
      END,
      updated_at = now()
    WHERE model_id IN (6, 7, 9);

    UPDATE "models"
    SET name = 'MG4 Urban', slug = 'mg4-urban', updated_at = now()
    WHERE id = 6;
  END IF;
END $$;--> statement-breakpoint

DROP INDEX "model_years_model_year_fuel_idx";--> statement-breakpoint
DROP INDEX "model_years_model_price_updated_idx";--> statement-breakpoint

ALTER TABLE "model_years" DROP CONSTRAINT "model_years_model_id_models_id_fk";--> statement-breakpoint

ALTER TABLE "model_years" DROP COLUMN "model_id";--> statement-breakpoint

DELETE FROM "models" AS m
WHERE (
    (m.id = 7 AND m.name = 'MG4 Urban Luxury (43 kWh)')
    OR (m.id = 9 AND m.name = 'MG4 Urban Luxury (54 kWh)')
  )
  AND EXISTS (
    SELECT 1
    FROM "models"
    WHERE id = 6
      AND name = 'MG4 Urban'
      AND slug = 'mg4-urban'
  );
