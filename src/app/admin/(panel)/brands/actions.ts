"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const brandSchema = z.object({
  name: z.string().min(1).max(100),
  originCountry: z.string().max(100).optional().default(""),
  logoUrl: z.string().url().optional().or(z.literal("")).default(""),
});

export async function createBrand(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;
  const parsed = brandSchema.safeParse({
    name: formData.get("name"),
    originCountry: formData.get("originCountry"),
    logoUrl: formData.get("logoUrl"),
  });
  if (!parsed.success) return;

  const slug = slugify(parsed.data.name);
  const [inserted] = await db
    .insert(brands)
    .values({
      name: parsed.data.name,
      slug,
      originCountry: parsed.data.originCountry || null,
      logoUrl: parsed.data.logoUrl || null,
    })
    .returning();

  await logAudit({
    adminId,
    action: "create",
    entityType: "brand",
    entityId: inserted.id,
    details: { name: inserted.name },
  });
  revalidatePath("/admin/brands");
  revalidatePath("/", "layout");
}

export async function toggleBrand(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;
  const id = Number(formData.get("id"));
  const [brand] = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) return;

  await db.update(brands).set({ isActive: !brand.isActive }).where(eq(brands.id, id));
  await logAudit({ adminId, action: "toggle_active", entityType: "brand", entityId: id });
  revalidatePath("/admin/brands");
  revalidatePath("/", "layout");
}

export async function deleteBrand(formData: FormData) {
  const adminId = await requireRole("admin");
  if (adminId === null) return;
  const id = Number(formData.get("id"));
  await db.delete(brands).where(eq(brands.id, id));
  await logAudit({ adminId, action: "delete", entityType: "brand", entityId: id });
  revalidatePath("/admin/brands");
  revalidatePath("/", "layout");
}

const updateBrandSchema = z.object({
  id: z.coerce.number(),
  name: z.string().min(1).max(100),
  originCountry: z.string().max(100).optional().default(""),
  logoUrl: z.string().url().optional().or(z.literal("")).default(""),
  isActive: z.coerce.boolean().optional().default(true),
});

export async function updateBrand(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;
  const parsed = updateBrandSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    originCountry: formData.get("originCountry"),
    logoUrl: formData.get("logoUrl"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) return;

  const { id, name, originCountry, logoUrl, isActive } = parsed.data;
  const [existing] = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  if (!existing) return;

  const slug = name === existing.name ? existing.slug : slugify(name);

  await db
    .update(brands)
    .set({
      name,
      slug,
      originCountry: originCountry || null,
      logoUrl: logoUrl || null,
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(brands.id, id));

  await logAudit({
    adminId,
    action: "update",
    entityType: "brand",
    entityId: id,
    details: { name },
  });
  revalidatePath("/admin/brands");
  revalidatePath("/", "layout");
}
