import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const vehicleCategory = pgEnum("vehicle_category", [
  "hatch",
  "sedan",
  "suv",
  "pickup",
  "mpv",
  "coupe",
  "convertible",
  "wagon",
  "van",
  "ev",
]);

export const fuelType = pgEnum("fuel_type", [
  "gasoline",
  "ethanol",
  "flex",
  "diesel",
  "hybrid",
  "hybrid_plug_in",
  "electric",
  "flex_hybrid",
]);

export const specGroup = pgEnum("spec_group", [
  "price",
  "engine",
  "transmission",
  "weight",
  "steering",
  "dimensions",
  "consumption",
  "suspension",
  "brakes",
  "warranty",
  "accessories",
  "comfort_technology",
  "safety",
  "sales",
]);

export const adminRole = pgEnum("admin_role", ["admin", "editor", "viewer"]);

export const editorialLocale = pgEnum("editorial_locale", ["pt-BR", "en-US"]);

export const auditAction = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "toggle_active",
  "import",
  "publish",
  "ai_generate",
  "login",
  "logout",
]);

/* ------------------------------------------------------------------ */
/* Brands                                                              */
/* ------------------------------------------------------------------ */

export const brands = pgTable(
  "brands",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    logoUrl: text("logo_url"),
    originCountry: varchar("origin_country", { length: 100 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("brands_slug_idx").on(table.slug)],
);

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

export const models = pgTable(
  "models",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    category: vehicleCategory("category"),
    sizeCategory: varchar("size_category", { length: 50 }),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("models_slug_idx").on(table.slug),
    index("models_brand_id_idx").on(table.brandId),
  ],
);

/* ------------------------------------------------------------------ */
/* Model Years                                                         */
/* ------------------------------------------------------------------ */

export const modelYears = pgTable(
  "model_years",
  {
    id: serial("id").primaryKey(),
    modelId: integer("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    fuelType: fuelType("fuel_type").notNull().default("flex"),
    fipeCode: varchar("fipe_code", { length: 20 }),
    isZeroKm: boolean("is_zero_km").notNull().default(false),
    priceFipe: numeric("price_fipe", { precision: 12, scale: 2 }),
    priceUpdatedAt: timestamp("price_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("model_years_model_year_fuel_idx").on(
      table.modelId,
      table.year,
      table.fuelType,
      table.isZeroKm,
    ),
    index("model_years_fipe_code_idx").on(table.fipeCode),
  ],
);

/* ------------------------------------------------------------------ */
/* Spec Categories                                                     */
/* ------------------------------------------------------------------ */

export const specCategories = pgTable(
  "spec_categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    unit: varchar("unit", { length: 40 }),
    displayOrder: integer("display_order").notNull().default(0),
    group: specGroup("spec_group").notNull().default("engine"),
    // "higher is better" — used by the comparison tool for best-in-category highlighting
    higherIsBetter: boolean("higher_is_better").notNull().default(true),
    // whether values are numeric (enables best-in-category logic)
    isNumeric: boolean("is_numeric").notNull().default(false),
  },
  (table) => [uniqueIndex("spec_categories_slug_idx").on(table.slug)],
);

/* ------------------------------------------------------------------ */
/* Spec Values                                                         */
/* ------------------------------------------------------------------ */

export const specValues = pgTable(
  "spec_values",
  {
    id: serial("id").primaryKey(),
    modelYearId: integer("model_year_id")
      .notNull()
      .references(() => modelYears.id, { onDelete: "cascade" }),
    specCategoryId: integer("spec_category_id")
      .notNull()
      .references(() => specCategories.id, { onDelete: "cascade" }),
    value: text("value"),
    numericValue: numeric("numeric_value", { precision: 14, scale: 4 }),
    displayValue: text("display_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("spec_values_model_year_category_idx").on(table.modelYearId, table.specCategoryId),
  ],
);

/* ------------------------------------------------------------------ */
/* Admin Users                                                         */
/* ------------------------------------------------------------------ */

export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 150 }),
    passwordHash: text("password_hash").notNull(),
    role: adminRole("role").notNull().default("admin"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("admin_users_email_idx").on(table.email)],
);

/* ------------------------------------------------------------------ */
/* Admin Audit Log                                                     */
/* ------------------------------------------------------------------ */

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    action: auditAction("action").notNull(),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: integer("entity_id"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("admin_audit_log_admin_idx").on(table.adminId)],
);

/* ------------------------------------------------------------------ */
/* Editorial                                                           */
/* ------------------------------------------------------------------ */

export const editorial = pgTable(
  "editorial",
  {
    id: serial("id").primaryKey(),
    modelYearId: integer("model_year_id")
      .notNull()
      .references(() => modelYears.id, { onDelete: "cascade" }),
    locale: editorialLocale("locale").notNull().default("pt-BR"),
    pros: jsonb("pros").$type<string[]>().notNull().default([]),
    cons: jsonb("cons").$type<string[]>().notNull().default([]),
    summary: text("summary"),
    rating: numeric("rating", { precision: 2, scale: 1 }),
    scoreBreakdown: jsonb("score_breakdown").$type<EditorialScoreBreakdown>(),
    transcripts: jsonb("transcripts").$type<EditorialTranscript[]>().notNull().default([]),
    sourceVideos: jsonb("source_videos")
      .$type<{ url: string; title?: string }[]>()
      .notNull()
      .default([]),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    reviewedBy: integer("reviewed_by").references(() => adminUsers.id, { onDelete: "set null" }),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("editorial_model_year_locale_idx").on(table.modelYearId, table.locale)],
);

/* ------------------------------------------------------------------ */
/* Sales Rankings (FENABRAVE)                                          */
/* ------------------------------------------------------------------ */

export const salesRankings = pgTable(
  "sales_rankings",
  {
    id: serial("id").primaryKey(),
    modelYearId: integer("model_year_id")
      .notNull()
      .references(() => modelYears.id, { onDelete: "cascade" }),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    unitsSold: integer("units_sold").notNull().default(0),
    rankingPosition: integer("ranking_position"),
    source: varchar("source", { length: 100 }).notNull().default("FENABRAVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sales_rankings_model_year_month_idx").on(
      table.modelYearId,
      table.month,
      table.year,
    ),
    index("sales_rankings_month_year_idx").on(table.month, table.year),
  ],
);

/* ------------------------------------------------------------------ */
/* FIPE History                                                        */
/* ------------------------------------------------------------------ */

export const fipeHistory = pgTable(
  "fipe_history",
  {
    id: serial("id").primaryKey(),
    modelYearId: integer("model_year_id")
      .notNull()
      .references(() => modelYears.id, { onDelete: "cascade" }),
    referenceMonth: varchar("reference_month", { length: 20 }).notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("fipe_history_model_year_reference_idx").on(
      table.modelYearId,
      table.referenceMonth,
    ),
    index("fipe_history_model_year_idx").on(table.modelYearId),
  ],
);

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const brandsRelations = relations(brands, ({ many }) => ({
  models: many(models),
}));

export const modelsRelations = relations(models, ({ one, many }) => ({
  brand: one(brands, { fields: [models.brandId], references: [brands.id] }),
  modelYears: many(modelYears),
}));

export const modelYearsRelations = relations(modelYears, ({ one, many }) => ({
  model: one(models, { fields: [modelYears.modelId], references: [models.id] }),
  specValues: many(specValues),
  editorial: many(editorial),
  salesRankings: many(salesRankings),
  fipeHistory: many(fipeHistory),
}));

export const specCategoriesRelations = relations(specCategories, ({ many }) => ({
  specValues: many(specValues),
}));

export const specValuesRelations = relations(specValues, ({ one }) => ({
  modelYear: one(modelYears, { fields: [specValues.modelYearId], references: [modelYears.id] }),
  specCategory: one(specCategories, {
    fields: [specValues.specCategoryId],
    references: [specCategories.id],
  }),
}));

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  auditLogs: many(adminAuditLog),
  reviewedEditorials: many(editorial),
}));

export const adminAuditLogRelations = relations(adminAuditLog, ({ one }) => ({
  admin: one(adminUsers, { fields: [adminAuditLog.adminId], references: [adminUsers.id] }),
}));

export const editorialRelations = relations(editorial, ({ one }) => ({
  modelYear: one(modelYears, { fields: [editorial.modelYearId], references: [modelYears.id] }),
  reviewer: one(adminUsers, { fields: [editorial.reviewedBy], references: [adminUsers.id] }),
}));

export const salesRankingsRelations = relations(salesRankings, ({ one }) => ({
  modelYear: one(modelYears, {
    fields: [salesRankings.modelYearId],
    references: [modelYears.id],
  }),
}));

export const fipeHistoryRelations = relations(fipeHistory, ({ one }) => ({
  modelYear: one(modelYears, {
    fields: [fipeHistory.modelYearId],
    references: [modelYears.id],
  }),
}));

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type ModelYear = typeof modelYears.$inferSelect;
export type NewModelYear = typeof modelYears.$inferInsert;
export type SpecCategory = typeof specCategories.$inferSelect;
export type NewSpecCategory = typeof specCategories.$inferInsert;
export type SpecValue = typeof specValues.$inferSelect;
export type NewSpecValue = typeof specValues.$inferInsert;
export type Editorial = typeof editorial.$inferSelect;
export type NewEditorial = typeof editorial.$inferInsert;

/** Per-category editorial scores (1.0–5.0), matching the radar dimensions. */
export interface EditorialScoreBreakdown {
  design: number;
  comfort: number;
  performance: number;
  technology: number;
  value: number;
}

/** A stored YouTube review transcript. */
export interface EditorialTranscript {
  videoUrl: string;
  title?: string;
  text: string;
}
export type SalesRanking = typeof salesRankings.$inferSelect;
export type NewSalesRanking = typeof salesRankings.$inferInsert;
export type FipeHistory = typeof fipeHistory.$inferSelect;
export type NewFipeHistory = typeof fipeHistory.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLog.$inferInsert;
