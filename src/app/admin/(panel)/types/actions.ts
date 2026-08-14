"use server";

import { asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { specGroups, vehicleCategories } from "@/lib/db/schema";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional().default(""),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
  isActive: z.coerce.boolean().optional().default(true),
});

const updateCategorySchema = categorySchema.extend({
  id: z.coerce.number().int().positive(),
});

const groupSchema = z.object({
  name: z.string().min(1).max(100),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
});

const updateGroupSchema = groupSchema.extend({
  id: z.coerce.number().int().positive(),
});

function isActiveFromForm(formData: FormData): boolean {
  const raw = formData.get("isActive");
  return raw === null ? true : raw === "on" || raw === "true";
}

export async function createVehicleCategory(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    icon: formData.get("icon") ?? "",
    displayOrder: formData.get("displayOrder") || 0,
    isActive: isActiveFromForm(formData),
  });
  if (!parsed.success) return;

  const slug = slugify(parsed.data.name);
  const [last] = await db
    .select({ displayOrder: vehicleCategories.displayOrder })
    .from(vehicleCategories)
    .orderBy(desc(vehicleCategories.displayOrder))
    .limit(1);
  const displayOrder = last ? last.displayOrder + 1 : parsed.data.displayOrder;

  const [inserted] = await db
    .insert(vehicleCategories)
    .values({ name: parsed.data.name, slug, icon: parsed.data.icon || null, displayOrder })
    .returning();

  await logAudit({
    adminId,
    action: "create",
    entityType: "vehicle_category",
    entityId: inserted.id,
    details: { name: inserted.name },
  });
  revalidatePath("/admin/types");
  revalidatePath("/", "layout");
}

export async function updateVehicleCategory(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;

  const parsed = updateCategorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    icon: formData.get("icon") ?? "",
    displayOrder: formData.get("displayOrder") || 0,
    isActive: isActiveFromForm(formData),
  });
  if (!parsed.success) return;

  const { id, name, icon, displayOrder, isActive } = parsed.data;
  const [existing] = await db.select().from(vehicleCategories).where(eq(vehicleCategories.id, id)).limit(1);
  if (!existing) return;

  const slug = name === existing.name ? existing.slug : slugify(name);

  await db
    .update(vehicleCategories)
    .set({ name, slug, icon: icon || null, displayOrder, isActive, updatedAt: new Date() })
    .where(eq(vehicleCategories.id, id));

  await logAudit({ adminId, action: "update", entityType: "vehicle_category", entityId: id, details: { name } });
  revalidatePath("/admin/types");
  revalidatePath("/", "layout");
}

export async function deleteVehicleCategory(formData: FormData) {
  const adminId = await requireRole("admin");
  if (adminId === null) return;

  const id = Number(formData.get("id"));
  await db.delete(vehicleCategories).where(eq(vehicleCategories.id, id));
  await logAudit({ adminId, action: "delete", entityType: "vehicle_category", entityId: id });
  revalidatePath("/admin/types");
  revalidatePath("/", "layout");
}

export async function createSpecGroup(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;

  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    displayOrder: formData.get("displayOrder") || 0,
  });
  if (!parsed.success) return;

  const slug = slugify(parsed.data.name);
  const [last] = await db
    .select({ displayOrder: specGroups.displayOrder })
    .from(specGroups)
    .orderBy(desc(specGroups.displayOrder))
    .limit(1);
  const displayOrder = last ? last.displayOrder + 1 : parsed.data.displayOrder;

  const [inserted] = await db
    .insert(specGroups)
    .values({ name: parsed.data.name, slug, displayOrder })
    .returning();

  await logAudit({
    adminId,
    action: "create",
    entityType: "spec_group",
    entityId: inserted.id,
    details: { name: inserted.name },
  });
  revalidatePath("/admin/types");
  revalidatePath("/", "layout");
}

export async function updateSpecGroup(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;

  const parsed = updateGroupSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    displayOrder: formData.get("displayOrder") || 0,
  });
  if (!parsed.success) return;

  const { id, name, displayOrder } = parsed.data;
  const [existing] = await db.select().from(specGroups).where(eq(specGroups.id, id)).limit(1);
  if (!existing) return;

  const slug = name === existing.name ? existing.slug : slugify(name);

  await db
    .update(specGroups)
    .set({ name, slug, displayOrder, updatedAt: new Date() })
    .where(eq(specGroups.id, id));

  await logAudit({ adminId, action: "update", entityType: "spec_group", entityId: id, details: { name } });
  revalidatePath("/admin/types");
  revalidatePath("/", "layout");
}

export async function deleteSpecGroup(formData: FormData) {
  const adminId = await requireRole("admin");
  if (adminId === null) return;

  const id = Number(formData.get("id"));
  await db.delete(specGroups).where(eq(specGroups.id, id));
  await logAudit({ adminId, action: "delete", entityType: "spec_group", entityId: id });
  revalidatePath("/admin/types");
  revalidatePath("/", "layout");
}

/** Move a vehicle category or spec group up/down by swapping display order. */
export async function reorderType(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;

  const kind = String(formData.get("kind"));
  const id = Number(formData.get("id"));
  const direction = String(formData.get("direction")) === "up" ? -1 : 1;
  const table = kind === "spec_group" ? specGroups : vehicleCategories;
  const orderCol = kind === "spec_group" ? specGroups.displayOrder : vehicleCategories.displayOrder;

  const [current] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  if (!current) return;

  const [neighbor] = await db
    .select()
    .from(table)
    .where(eq(orderCol, current.displayOrder + direction))
    .limit(1);

  if (!neighbor) return;

  await db.update(table).set({ displayOrder: neighbor.displayOrder }).where(eq(table.id, current.id));
  await db.update(table).set({ displayOrder: current.displayOrder }).where(eq(table.id, neighbor.id));

  await logAudit({
    adminId,
    action: "update",
    entityType: kind,
    entityId: id,
    details: { direction, displayOrder: current.displayOrder + direction },
  });
  revalidatePath("/admin/types");
  revalidatePath("/", "layout");
}

export async function listTypes() {
  const categories = await db.select().from(vehicleCategories).orderBy(asc(vehicleCategories.displayOrder));
  const groups = await db.select().from(specGroups).orderBy(asc(specGroups.displayOrder));
  return { categories, groups };
}
