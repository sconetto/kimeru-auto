"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/admin/audit";
import { auth } from "@/lib/auth";
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

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return Number(session.user.id);
}

const specCategorySchema = z.object({
  name: z.string().min(1).max(100),
  unit: z.string().max(40).optional().default(""),
  group: z.enum(specGroup.enumValues),
  higherIsBetter: z.coerce.boolean().optional().default(true),
  isNumeric: z.coerce.boolean().optional().default(false),
});

export async function createSpecCategory(formData: FormData) {
  const adminId = await requireAdmin();
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
  const adminId = await requireAdmin();
  const id = Number(formData.get("id"));
  await db.delete(specCategories).where(eq(specCategories.id, id));
  await logAudit({ adminId, action: "delete", entityType: "spec_category", entityId: id });
  revalidatePath("/admin/specs");
  revalidatePath("/", "layout");
}
