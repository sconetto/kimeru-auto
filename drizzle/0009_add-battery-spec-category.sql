INSERT INTO "spec_categories" ("name", "slug", "unit", "display_order", "spec_group", "higher_is_better", "is_numeric")
VALUES ('Bateria', 'battery', 'kWh', 66, 'engine', true, true)
ON CONFLICT ("slug") DO NOTHING;
