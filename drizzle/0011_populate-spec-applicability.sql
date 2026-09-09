UPDATE "spec_categories" SET "applicable_fuel_types" = ARRAY['gasoline','ethanol','flex','diesel','hybrid','hybrid_plug_in','flex_hybrid']::"fuel_type"[] WHERE "slug" IN ('engine-type','cylinders','valves','displacement','injection','ignition','fuel-tank');--> statement-breakpoint
UPDATE "spec_categories" SET "applicable_fuel_types" = ARRAY['hybrid','hybrid_plug_in','flex_hybrid','electric']::"fuel_type"[] WHERE "slug" = 'battery';--> statement-breakpoint
UPDATE "spec_categories" SET "applicable_fuel_types" = ARRAY['gasoline','flex','hybrid','hybrid_plug_in','flex_hybrid']::"fuel_type"[] WHERE "slug" IN ('consumption-city-gasoline','consumption-highway-gasoline');--> statement-breakpoint
UPDATE "spec_categories" SET "applicable_fuel_types" = ARRAY['ethanol','flex','flex_hybrid']::"fuel_type"[] WHERE "slug" IN ('consumption-city-ethanol','consumption-highway-ethanol');--> statement-breakpoint
INSERT INTO "spec_categories" ("name", "slug", "unit", "display_order", "spec_group", "higher_is_better", "is_numeric", "applicable_fuel_types")
VALUES
  ('Autonomia', 'range', 'km', 67, 'engine', true, true, ARRAY['electric','hybrid_plug_in']::"fuel_type"[]),
  ('Consumo cidade (elétrico)', 'consumption-city-electric', 'kWh/100km', 74, 'consumption', false, true, ARRAY['electric','hybrid_plug_in']::"fuel_type"[]),
  ('Consumo estrada (elétrico)', 'consumption-highway-electric', 'kWh/100km', 75, 'consumption', false, true, ARRAY['electric','hybrid_plug_in']::"fuel_type"[])
ON CONFLICT ("slug") DO NOTHING;
