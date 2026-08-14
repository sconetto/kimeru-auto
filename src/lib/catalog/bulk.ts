import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  brands,
  fuelType,
  modelYears,
  models,
  specCategories,
  specGroups,
  vehicleCategories,
} from "@/lib/db/schema";
import {
  ENTITY_LABELS,
  EXPORTABLE_ENTITIES,
  type ExportableEntity,
} from "./bulk-entities";

/* ------------------------------------------------------------------ */
/* CSV helpers                                                        */
/* ------------------------------------------------------------------ */

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined): string => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function csvBool(v: string | undefined, fallback = false): boolean {
  if (v == null || v.trim() === "") return fallback;
  return ["1", "true", "sim", "yes", "on", "s"].includes(v.trim().toLowerCase());
}

/* ------------------------------------------------------------------ */
/* Entity definitions: export + import                                */
/* ------------------------------------------------------------------ */

export interface ExportSpec {
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

export async function exportEntity(entity: string): Promise<ExportSpec | null> {
  switch (entity) {
    case "brands": {
      const rows = await db.select().from(brands).orderBy(asc(brands.name));
      return {
        headers: ["name", "slug", "origin_country", "logo_url", "is_active"],
        rows: rows.map((r) => [r.name, r.slug, r.originCountry, r.logoUrl, r.isActive ? 1 : 0]),
      };
    }
    case "models": {
      const rows = await db
        .select({
          brandSlug: brands.slug,
          name: models.name,
          slug: models.slug,
          category: models.category,
          sizeCategory: models.sizeCategory,
          imageUrl: models.imageUrl,
          isActive: models.isActive,
        })
        .from(models)
        .innerJoin(brands, eq(brands.id, models.brandId))
        .orderBy(asc(brands.name), asc(models.name));
      return {
        headers: ["brand_slug", "name", "slug", "category", "size_category", "image_url", "is_active"],
        rows: rows.map((r) => [
          r.brandSlug,
          r.name,
          r.slug,
          r.category,
          r.sizeCategory,
          r.imageUrl,
          r.isActive ? 1 : 0,
        ]),
      };
    }
    case "model-years": {
      const rows = await db
        .select({
          modelSlug: models.slug,
          year: modelYears.year,
          fuelType: modelYears.fuelType,
          fipeCode: modelYears.fipeCode,
          isZeroKm: modelYears.isZeroKm,
          priceFipe: modelYears.priceFipe,
        })
        .from(modelYears)
        .innerJoin(models, eq(models.id, modelYears.modelId))
        .orderBy(asc(models.slug), asc(modelYears.year));
      return {
        headers: ["model_slug", "year", "fuel_type", "fipe_code", "is_zero_km", "price_fipe"],
        rows: rows.map((r) => [
          r.modelSlug,
          r.year,
          r.fuelType,
          r.fipeCode,
          r.isZeroKm ? 1 : 0,
          r.priceFipe,
        ]),
      };
    }
    case "specs": {
      const rows = await db
        .select()
        .from(specCategories)
        .orderBy(asc(specCategories.group), asc(specCategories.displayOrder));
      return {
        headers: [
          "name",
          "slug",
          "unit",
          "display_order",
          "group",
          "higher_is_better",
          "is_numeric",
        ],
        rows: rows.map((r) => [
          r.name,
          r.slug,
          r.unit,
          r.displayOrder,
          r.group,
          r.higherIsBetter ? 1 : 0,
          r.isNumeric ? 1 : 0,
        ]),
      };
    }
    default:
      return null;
  }
}

export interface ImportRowResult {
  rowNumber: number;
  status: "created" | "updated" | "skipped" | "error";
  message: string;
}

export interface ImportOutcome {
  entity: string;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportRowResult[];
}

/** Import rows for a catalog entity. Applies valid rows; returns per-row results. */
export async function importEntity(
  entity: string,
  headers: string[],
  rows: string[][],
): Promise<ImportOutcome | null> {
  const idx = (name: string) => headers.indexOf(name);

  if (entity === "brands") {
    const nameIdx = idx("name");
    const originIdx = idx("origin_country");
    const logoIdx = idx("logo_url");
    const activeIdx = idx("is_active");
    const outcome: ImportOutcome = { entity, created: 0, updated: 0, skipped: 0, errors: [] };

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const name = row[nameIdx]?.trim();
      if (!name) {
        outcome.errors.push({ rowNumber: r + 2, status: "error", message: "Nome obrigatório" });
        continue;
      }
      const slug = slugify(name);
      const existing = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
      const values = {
        name,
        slug,
        originCountry: originIdx >= 0 && row[originIdx]?.trim() ? row[originIdx].trim() : null,
        logoUrl: logoIdx >= 0 && row[logoIdx]?.trim() ? row[logoIdx].trim() : null,
        isActive: activeIdx >= 0 ? csvBool(row[activeIdx], true) : true,
      };
      if (existing.length > 0) {
        await db.update(brands).set(values).where(eq(brands.id, existing[0].id));
        outcome.updated++;
      } else {
        await db.insert(brands).values(values);
        outcome.created++;
      }
    }
    return outcome;
  }

  if (entity === "models") {
    const brandIdx = idx("brand_slug");
    const nameIdx = idx("name");
    const categoryIdx = idx("category");
    const sizeIdx = idx("size_category");
    const imageIdx = idx("image_url");
    const activeIdx = idx("is_active");
    const outcome: ImportOutcome = { entity, created: 0, updated: 0, skipped: 0, errors: [] };

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const name = row[nameIdx]?.trim();
      const brandSlug = row[brandIdx]?.trim();
      if (!name || !brandSlug) {
        outcome.errors.push({ rowNumber: r + 2, status: "error", message: "Nome e brand_slug obrigatórios" });
        continue;
      }
      const [brand] = await db.select().from(brands).where(eq(brands.slug, brandSlug)).limit(1);
      if (!brand) {
        outcome.errors.push({ rowNumber: r + 2, status: "error", message: `Marca desconhecida: ${brandSlug}` });
        continue;
      }
      const categorySlug = categoryIdx >= 0 ? row[categoryIdx]?.trim() : undefined;
      if (categorySlug) {
        const [cat] = await db
          .select()
          .from(vehicleCategories)
          .where(eq(vehicleCategories.slug, categorySlug))
          .limit(1);
        if (!cat) {
          outcome.errors.push({ rowNumber: r + 2, status: "error", message: `Categoria desconhecida: ${categorySlug}` });
          continue;
        }
      }
      const slug = slugify(name);
      const existing = await db
        .select()
        .from(models)
        .where(and(eq(models.slug, slug), eq(models.brandId, brand.id)))
        .limit(1);
      const values = {
        brandId: brand.id,
        name,
        slug,
        category: (categorySlug || null) as typeof models.$inferSelect.category,
        sizeCategory: sizeIdx >= 0 && row[sizeIdx]?.trim() ? row[sizeIdx].trim() : null,
        imageUrl: imageIdx >= 0 && row[imageIdx]?.trim() ? row[imageIdx].trim() : null,
        isActive: activeIdx >= 0 ? csvBool(row[activeIdx], true) : true,
      };
      if (existing.length > 0) {
        await db.update(models).set(values).where(eq(models.id, existing[0].id));
        outcome.updated++;
      } else {
        await db.insert(models).values(values);
        outcome.created++;
      }
    }
    return outcome;
  }

  if (entity === "model-years") {
    const modelIdx = idx("model_slug");
    const yearIdx = idx("year");
    const fuelIdx = idx("fuel_type");
    const fipeIdx = idx("fipe_code");
    const zeroIdx = idx("is_zero_km");
    const priceIdx = idx("price_fipe");
    const outcome: ImportOutcome = { entity, created: 0, updated: 0, skipped: 0, errors: [] };
    const fuelValues = fuelType.enumValues as readonly string[];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const modelSlug = row[modelIdx]?.trim();
      const year = Number(row[yearIdx]?.trim());
      if (!modelSlug || Number.isNaN(year)) {
        outcome.errors.push({ rowNumber: r + 2, status: "error", message: "model_slug e year obrigatórios" });
        continue;
      }
      const [model] = await db.select().from(models).where(eq(models.slug, modelSlug)).limit(1);
      if (!model) {
        outcome.errors.push({ rowNumber: r + 2, status: "error", message: `Modelo desconhecido: ${modelSlug}` });
        continue;
      }
      const fuel = fuelIdx >= 0 ? row[fuelIdx]?.trim() : "flex";
      if (!fuelValues.includes(fuel)) {
        outcome.errors.push({ rowNumber: r + 2, status: "error", message: `Combustível inválido: ${fuel}` });
        continue;
      }
      const isZeroKm = zeroIdx >= 0 ? csvBool(row[zeroIdx]) : false;
      const existing = await db
        .select()
        .from(modelYears)
        .where(
          and(
            eq(modelYears.modelId, model.id),
            eq(modelYears.year, year),
            eq(modelYears.fuelType, fuel as typeof modelYears.$inferSelect.fuelType),
            eq(modelYears.isZeroKm, isZeroKm),
          ),
        )
        .limit(1);
      const values = {
        modelId: model.id,
        year,
        fuelType: fuel as typeof modelYears.$inferSelect.fuelType,
        fipeCode: fipeIdx >= 0 && row[fipeIdx]?.trim() ? row[fipeIdx].trim() : null,
        isZeroKm,
        priceFipe: priceIdx >= 0 && row[priceIdx]?.trim() ? row[priceIdx].trim() : null,
      };
      if (existing.length > 0) {
        await db.update(modelYears).set(values).where(eq(modelYears.id, existing[0].id));
        outcome.updated++;
      } else {
        await db.insert(modelYears).values(values);
        outcome.created++;
      }
    }
    return outcome;
  }

  if (entity === "specs") {
    const nameIdx = idx("name");
    const unitIdx = idx("unit");
    const orderIdx = idx("display_order");
    const groupIdx = idx("group");
    const higherIdx = idx("higher_is_better");
    const numericIdx = idx("is_numeric");
    const outcome: ImportOutcome = { entity, created: 0, updated: 0, skipped: 0, errors: [] };
    const groupValues = specGroups ? (await db.select().from(specGroups)).map((g) => g.slug) : [];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const name = row[nameIdx]?.trim();
      const group = groupIdx >= 0 ? row[groupIdx]?.trim() : "engine";
      if (!name || !groupValues.includes(group)) {
        outcome.errors.push({
          rowNumber: r + 2,
          status: "error",
          message: !name ? "Nome obrigatório" : `Grupo desconhecido: ${group}`,
        });
        continue;
      }
      const slug = slugify(name);
      const existing = await db.select().from(specCategories).where(eq(specCategories.slug, slug)).limit(1);
      const values = {
        name,
        slug,
        unit: unitIdx >= 0 && row[unitIdx]?.trim() ? row[unitIdx].trim() : null,
        displayOrder: orderIdx >= 0 ? Number(row[orderIdx]) || 0 : 0,
        group: group as typeof specCategories.$inferSelect.group,
        higherIsBetter: higherIdx >= 0 ? csvBool(row[higherIdx], true) : true,
        isNumeric: numericIdx >= 0 ? csvBool(row[numericIdx]) : false,
      };
      if (existing.length > 0) {
        await db.update(specCategories).set(values).where(eq(specCategories.id, existing[0].id));
        outcome.updated++;
      } else {
        await db.insert(specCategories).values(values);
        outcome.created++;
      }
    }
    return outcome;
  }

  return null;
}

