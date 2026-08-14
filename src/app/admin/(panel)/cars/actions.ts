"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { fipeHistory, fuelType, models, modelYears, vehicleCategory } from "@/lib/db/schema";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const modelSchema = z.object({
  brandId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(200),
  category: z.enum(vehicleCategory.enumValues).optional().nullable(),
  imageUrl: z.string().url().optional().or(z.literal("")).default(""),
});

const modelYearSchema = z.object({
  modelId: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(1980).max(2100),
  fuelType: z.enum(fuelType.enumValues),
  fipeCode: z.string().max(20).optional().default(""),
  isZeroKm: z.coerce.boolean().optional().default(false),
});

export async function createModel(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;
  const parsed = modelSchema.safeParse({
    brandId: formData.get("brandId"),
    name: formData.get("name"),
    category: formData.get("category") || null,
    imageUrl: formData.get("imageUrl"),
  });
  if (!parsed.success) return;

  const slug = slugify(parsed.data.name);
  const [inserted] = await db
    .insert(models)
    .values({
      brandId: parsed.data.brandId,
      name: parsed.data.name,
      slug,
      category: parsed.data.category,
      imageUrl: parsed.data.imageUrl || null,
    })
    .returning();

  await logAudit({
    adminId,
    action: "create",
    entityType: "model",
    entityId: inserted.id,
    details: { name: inserted.name },
  });
  revalidatePath("/admin/cars");
  revalidatePath("/", "layout");
}

export async function createModelYear(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;
  const parsed = modelYearSchema.safeParse({
    modelId: formData.get("modelId"),
    year: formData.get("year"),
    fuelType: formData.get("fuelType"),
    fipeCode: formData.get("fipeCode"),
    isZeroKm: formData.get("isZeroKm") === "on",
  });
  if (!parsed.success) return;

  const [inserted] = await db
    .insert(modelYears)
    .values({
      modelId: parsed.data.modelId,
      year: parsed.data.year,
      fuelType: parsed.data.fuelType,
      fipeCode: parsed.data.fipeCode || null,
      isZeroKm: parsed.data.isZeroKm,
    })
    .returning();

  await logAudit({ adminId, action: "create", entityType: "model_year", entityId: inserted.id });
  revalidatePath("/admin/cars");
  revalidatePath("/", "layout");
}

const updateModelSchema = z.object({
  id: z.coerce.number().int().positive(),
  brandId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional().nullable(),
  sizeCategory: z.string().max(50).optional().nullable(),
  imageUrl: z.string().url().optional().or(z.literal("")).default(""),
  isActive: z.coerce.boolean().optional().default(true),
});

export async function updateModel(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;
  const parsed = updateModelSchema.safeParse({
    id: formData.get("id"),
    brandId: formData.get("brandId"),
    name: formData.get("name"),
    category: formData.get("category") || null,
    sizeCategory: formData.get("sizeCategory") || null,
    imageUrl: formData.get("imageUrl"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) return;

  const { id, brandId, name, category, sizeCategory, imageUrl, isActive } = parsed.data;
  const [existing] = await db.select().from(models).where(eq(models.id, id)).limit(1);
  if (!existing) return;

  const slug = name === existing.name ? existing.slug : slugify(name);

  await db
    .update(models)
    .set({
      brandId,
      name,
      slug,
      category: (category || null) as (typeof models.$inferSelect)["category"],
      sizeCategory: sizeCategory || null,
      imageUrl: imageUrl || null,
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(models.id, id));

  await logAudit({
    adminId,
    action: "update",
    entityType: "model",
    entityId: id,
    details: { name },
  });
  revalidatePath("/admin/cars");
  revalidatePath("/", "layout");
}

const updateModelYearSchema = z.object({
  id: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(1980).max(2100),
  fuelType: z.enum(fuelType.enumValues),
  fipeCode: z.string().max(20).optional().default(""),
  isZeroKm: z.coerce.boolean().optional().default(false),
  priceFipe: z.string().optional().default(""),
});

export async function updateModelYear(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;
  const parsed = updateModelYearSchema.safeParse({
    id: formData.get("id"),
    year: formData.get("year"),
    fuelType: formData.get("fuelType"),
    fipeCode: formData.get("fipeCode"),
    isZeroKm: formData.get("isZeroKm") === "on",
    priceFipe: formData.get("priceFipe"),
  });
  if (!parsed.success) return;

  const { id, year, fuelType: fuel, fipeCode, isZeroKm, priceFipe } = parsed.data;
  const [existing] = await db.select().from(modelYears).where(eq(modelYears.id, id)).limit(1);
  if (!existing) return;

  const price = priceFipe ? priceFipe.replace(",", ".") : null;
  await db
    .update(modelYears)
    .set({
      year,
      fuelType: fuel,
      fipeCode: fipeCode || null,
      isZeroKm,
      priceFipe: price ?? existing.priceFipe,
      priceUpdatedAt: price ? new Date() : existing.priceUpdatedAt,
      updatedAt: new Date(),
    })
    .where(eq(modelYears.id, id))
    .returning();

  if (price && price !== existing.priceFipe) {
    const refMonth = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    await db.insert(fipeHistory).values({ modelYearId: id, referenceMonth: refMonth, price });
  }

  await logAudit({
    adminId,
    action: "update",
    entityType: "model_year",
    entityId: id,
    details: { year, fipeCode },
  });
  revalidatePath("/admin/cars");
  revalidatePath("/admin/model-years");
  revalidatePath("/", "layout");
}

export async function deleteModel(formData: FormData) {
  const adminId = await requireRole("admin");
  if (adminId === null) return;
  const id = Number(formData.get("id"));
  await db.delete(models).where(eq(models.id, id));
  await logAudit({ adminId, action: "delete", entityType: "model", entityId: id });
  revalidatePath("/admin/cars");
  revalidatePath("/", "layout");
}

export async function deleteModelYear(formData: FormData) {
  const adminId = await requireRole("admin");
  if (adminId === null) return;
  const id = Number(formData.get("id"));
  await db.delete(modelYears).where(eq(modelYears.id, id));
  await logAudit({ adminId, action: "delete", entityType: "model_year", entityId: id });
  revalidatePath("/admin/cars");
  revalidatePath("/", "layout");
}
