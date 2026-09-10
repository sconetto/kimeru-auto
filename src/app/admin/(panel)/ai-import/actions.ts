"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/require-role";
import { powertrainOf } from "@/lib/catalog/powertrain";
import { slugify } from "@/lib/catalog/slug";
import { resolveOrCreateVersion } from "@/lib/catalog/versions";
import { db } from "@/lib/db";
import {
  brands,
  fuelType,
  models,
  modelYears,
  specCategories,
  specValues,
  vehicleCategory,
} from "@/lib/db/schema";

const createCarSchema = z.object({
  brandId: z.number().int().positive().nullable(),
  brandName: z.string().min(1).max(200),
  model: z.string().min(1).max(200),
  year: z.number().int().min(1980).max(2100),
  fuelType: z.enum(fuelType.enumValues),
  priceFipe: z.number().positive().nullable(),
  isZeroKm: z.boolean(),
  category: z.enum(vehicleCategory.enumValues).nullable(),
  sizeCategory: z.string().max(50).nullable(),
  fipeCode: z.string().max(20).nullable(),
  specs: z
    .array(
      z.object({
        slug: z.string().min(1).max(120),
        value: z.string(),
        numericValue: z.number().nullable(),
      }),
    )
    .max(60),
});

export interface CreateCarResult {
  ok: boolean;
  modelId?: number;
  error?: string;
}

/** Create brand + model + model-year + specs from reviewed AI-parsed data. */
export async function createCarFromAi(payload: unknown): Promise<CreateCarResult> {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return { ok: false, error: "Não autorizado" };

  const parsed = createCarSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };

  const {
    brandId,
    brandName,
    model,
    year,
    fuelType: fuel,
    priceFipe,
    isZeroKm,
    category,
    sizeCategory,
    fipeCode,
    specs,
  } = parsed.data;

  // 1. Resolve (or create) the brand
  let resolvedBrandId = brandId;
  if (resolvedBrandId === null) {
    const [existing] = await db
      .select()
      .from(brands)
      .where(eq(brands.slug, slugify(brandName)))
      .limit(1);
    if (existing) {
      resolvedBrandId = existing.id;
    } else {
      const [created] = await db
        .insert(brands)
        .values({ name: brandName, slug: slugify(brandName) })
        .returning();
      resolvedBrandId = created.id;
      await logAudit({
        adminId,
        action: "create",
        entityType: "brand",
        entityId: created.id,
        details: { name: brandName },
      });
    }
  }

  // 2. Create the model (guard against duplicate slug)
  const modelSlug = slugify(model);
  const [existingModel] = await db
    .select({ id: models.id })
    .from(models)
    .where(eq(models.slug, modelSlug))
    .limit(1);
  if (existingModel) {
    return { ok: false, error: `Modelo "${model}" já existe no catálogo` };
  }

  const [insertedModel] = await db
    .insert(models)
    .values({
      brandId: resolvedBrandId,
      name: model,
      slug: modelSlug,
      category,
      sizeCategory,
    })
    .returning();

  // 3. Create the model year (attached to a default version)
  const [insertedYear] = await db
    .insert(modelYears)
    .values({
      modelVersionId: await resolveOrCreateVersion(insertedModel.id),
      year,
      fuelType: fuel,
      powertrain: powertrainOf(fuel),
      priceFipe: priceFipe?.toString() ?? null,
      isZeroKm,
      fipeCode: fipeCode || null,
    })
    .returning();

  // 4. Create spec values (map slug → category id)
  const specRows = await db
    .select({ id: specCategories.id, slug: specCategories.slug })
    .from(specCategories);
  const specMap = new Map(specRows.map((s) => [s.slug, s.id]));
  for (const spec of specs) {
    const categoryId = specMap.get(spec.slug);
    if (!categoryId) continue;
    await db.insert(specValues).values({
      modelYearId: insertedYear.id,
      specCategoryId: categoryId,
      value: spec.value,
      numericValue: spec.numericValue?.toString() ?? null,
      displayValue: spec.value,
    });
  }

  await logAudit({
    adminId,
    action: "create",
    entityType: "model",
    entityId: insertedModel.id,
    details: { name: model },
  });
  revalidatePath("/admin/cars");
  revalidatePath("/", "layout");

  return { ok: true, modelId: insertedModel.id };
}
