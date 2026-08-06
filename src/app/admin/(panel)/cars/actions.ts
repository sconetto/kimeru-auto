"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/admin/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fuelType, models, modelYears, vehicleCategory } from "@/lib/db/schema";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return Number(session.user.id);
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
  const adminId = await requireAdmin();
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
  const adminId = await requireAdmin();
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

export async function deleteModel(formData: FormData) {
  const adminId = await requireAdmin();
  const id = Number(formData.get("id"));
  await db.delete(models).where(eq(models.id, id));
  await logAudit({ adminId, action: "delete", entityType: "model", entityId: id });
  revalidatePath("/admin/cars");
  revalidatePath("/", "layout");
}

export async function deleteModelYear(formData: FormData) {
  const adminId = await requireAdmin();
  const id = Number(formData.get("id"));
  await db.delete(modelYears).where(eq(modelYears.id, id));
  await logAudit({ adminId, action: "delete", entityType: "model_year", entityId: id });
  revalidatePath("/admin/cars");
  revalidatePath("/", "layout");
}
