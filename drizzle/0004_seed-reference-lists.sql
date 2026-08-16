INSERT INTO "vehicle_categories" ("name", "slug", "icon", "display_order", "is_active")
VALUES
  ('Hatch', 'hatch', 'car-front', 1, true),
  ('Sedan', 'sedan', 'car-front', 2, true),
  ('SUV', 'suv', 'car-front', 3, true),
  ('Picape', 'pickup', 'truck', 4, true),
  ('Minivan', 'mpv', 'car-front', 5, true),
  ('Coupé', 'coupe', 'car-front', 6, true),
  ('Conversível', 'convertible', 'car-front', 7, true),
  ('Perua', 'wagon', 'car-front', 8, true),
  ('Van', 'van', 'truck', 9, true),
  ('Elétrico', 'ev', 'zap', 10, true)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
INSERT INTO "spec_groups" ("name", "slug", "display_order")
VALUES
  ('Preço', 'price', 1),
  ('Motor', 'engine', 2),
  ('Transmissão', 'transmission', 3),
  ('Peso', 'weight', 4),
  ('Direção', 'steering', 5),
  ('Dimensões', 'dimensions', 6),
  ('Consumo', 'consumption', 7),
  ('Suspensão', 'suspension', 8),
  ('Freios', 'brakes', 9),
  ('Garantia', 'warranty', 10),
  ('Acessórios', 'accessories', 11),
  ('Conforto e Tecnologia', 'comfort_technology', 12),
  ('Segurança', 'safety', 13),
  ('Vendas', 'sales', 14)
ON CONFLICT ("slug") DO NOTHING;
