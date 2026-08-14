"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { specCategories, specGroup } from "@/lib/db/schema";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}


const specCategorySchema = z.object({
  name: z.string().min(1).max(100),
  unit: z.string().max(40).optional().default(""),
  group: z.enum(specGroup.enumValues),
  higherIsBetter: z.coerce.boolean().optional().default(true),
  isNumeric: z.coerce.boolean().optional().default(false),
});

export async function createSpecCategory(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;
  const parsed = specCategorySchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
    group: formData.get("group"),
    higherIsBetter: formData.get("higherIsBetter") === "on",
    isNumeric: formData.get("isNumeric") === "on",
  });
  if (!parsed.success) return;

  const slug = slugify(parsed.data.name);
  const [inserted] = await db
    .insert(specCategories)
    .values({
      name: parsed.data.name,
      slug,
      unit: parsed.data.unit || null,
      group: parsed.data.group,
      higherIsBetter: parsed.data.higherIsBetter,
      isNumeric: parsed.data.isNumeric,
      displayOrder: 1000,
    })
    .returning();

  await logAudit({
    adminId,
    action: "create",
    entityType: "spec_category",
    entityId: inserted.id,
    details: { name: inserted.name },
  });
  revalidatePath("/admin/specs");
  revalidatePath("/", "layout");
}

export async function deleteSpecCategory(formData: FormData) {
  const adminId = await requireRole("admin");
  if (adminId === null) return;
  const id = Number(formData.get("id"));
  await db.delete(specCategories).where(eq(specCategories.id, id));
  await logAudit({ adminId, action: "delete", entityType: "spec_category", entityId: id });
  revalidatePath("/admin/specs");
  revalidatePath("/", "layout");
}

const updateSpecCategorySchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().min(1).max(100),
  unit: z.string().max(40).optional().default(""),
  group: z.enum(specGroup.enumValues),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
  higherIsBetter: z.coerce.boolean().optional().default(true),
  isNumeric: z.coerce.boolean().optional().default(false),
});

export async function updateSpecCategory(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;
  const parsed = updateSpecCategorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    unit: formData.get("unit"),
    group: formData.get("group"),
    displayOrder: formData.get("displayOrder") || 0,
    higherIsBetter: formData.get("higherIsBetter") === "on",
    isNumeric: formData.get("isNumeric") === "on",
  });
  if (!parsed.success) return;

  const { id, name, unit, group, displayOrder, higherIsBetter, isNumeric } = parsed.data;
  const [existing] = await db.select().from(specCategories).where(eq(specCategories.id, id)).limit(1);
  if (!existing) return;

  const slug = name === existing.name ? existing.slug : slugify(name);

  await db
    .update(specCategories)
    .set({
      name,
      slug,
      unit: unit || null,
      group,
      displayOrder,
      higherIsBetter,
      isNumeric,
    })
    .where(eq(specCategories.id, id));

  await logAudit({
    adminId,
    action: "update",
    entityType: "spec_category",
    entityId: id,
    details: { name },
  });
  revalidatePath("/admin/specs");
  revalidatePath("/", "layout");
}
