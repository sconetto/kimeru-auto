"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { models, modelVersions } from "@/lib/db/schema";

/**
 * Promote an auto-created placeholder to a real catalog model.
 *
 * A placeholder only has sales rows, so activating it before someone adds a
 * version would publish an empty car page. The version check keeps that door
 * closed and sends the admin back to the queue with a reason.
 */
export async function markModelEnriched(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;

  const modelId = Number(formData.get("modelId"));
  if (!Number.isFinite(modelId)) redirect("/admin/enrichment?notice=invalid");

  const [variant] = await db
    .select({ id: modelVersions.id })
    .from(modelVersions)
    .where(eq(modelVersions.modelId, modelId))
    .limit(1);

  if (!variant) {
    redirect(`/admin/enrichment?notice=no-variants&model=${modelId}`);
  }

  await db
    .update(models)
    .set({ needsEnrichment: false, isActive: true, updatedAt: new Date() })
    .where(eq(models.id, modelId));

  await logAudit({
    adminId,
    action: "update",
    entityType: "model",
    entityId: modelId,
    details: { action: "mark_enriched" },
  });

  revalidatePath("/admin/enrichment");
  revalidatePath("/admin/cars");
  revalidatePath("/", "layout");
  redirect("/admin/enrichment?notice=enriched");
}
