"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { editorial, editorialLocale } from "@/lib/db/schema";

const scoreBreakdownSchema = z
  .object({
    design: z.number().min(1).max(5),
    comfort: z.number().min(1).max(5),
    performance: z.number().min(1).max(5),
    technology: z.number().min(1).max(5),
    value: z.number().min(1).max(5),
  })
  .nullable()
  .optional();

const saveEditorialSchema = z.object({
  modelYearId: z.coerce.number().int().positive(),
  locale: z.enum(editorialLocale.enumValues),
  pros: z.array(z.string().max(200)).max(5),
  cons: z.array(z.string().max(200)).max(5),
  summary: z.string().max(2000),
  rating: z.coerce.number().min(1).max(5),
  scoreBreakdown: scoreBreakdownSchema,
  transcripts: z
    .array(z.object({ videoUrl: z.string().url(), title: z.string().optional(), text: z.string() }))
    .optional(),
  sourceVideos: z
    .array(z.object({ url: z.string().url(), title: z.string().optional() }))
    .optional(),
  publish: z.coerce.boolean().optional().default(false),
});

/** Save editorial content (draft or publish). editor+ role. */
export async function saveEditorial(formData: FormData) {
  const adminId = await requireRole("admin", "editor");
  if (adminId === null) return;

  const parsed = saveEditorialSchema.safeParse({
    modelYearId: formData.get("modelYearId"),
    locale: formData.get("locale"),
    pros: JSON.parse(String(formData.get("pros") ?? "[]")),
    cons: JSON.parse(String(formData.get("cons") ?? "[]")),
    summary: formData.get("summary"),
    rating: formData.get("rating"),
    scoreBreakdown: formData.get("scoreBreakdown")
      ? JSON.parse(String(formData.get("scoreBreakdown")))
      : null,
    transcripts: JSON.parse(String(formData.get("transcripts") ?? "[]")),
    sourceVideos: JSON.parse(String(formData.get("sourceVideos") ?? "[]")),
    publish: ["on", "true", "1"].includes(String(formData.get("publish"))),
  });
  if (!parsed.success) return;

  const { modelYearId, locale, publish } = parsed.data;
  const existing = await db
    .select()
    .from(editorial)
    .where(and(eq(editorial.modelYearId, modelYearId), eq(editorial.locale, locale)))
    .limit(1);

  const values = {
    pros: parsed.data.pros,
    cons: parsed.data.cons,
    summary: parsed.data.summary,
    rating: String(parsed.data.rating),
    scoreBreakdown: parsed.data.scoreBreakdown ?? null,
    transcripts: parsed.data.transcripts ?? [],
    sourceVideos: parsed.data.sourceVideos ?? [],
    published: publish,
    ...(publish ? { reviewedBy: adminId, aiGenerated: false } : {}),
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db.update(editorial).set(values).where(eq(editorial.id, existing[0].id));
  } else {
    await db.insert(editorial).values({ modelYearId, locale, ...values });
  }

  await logAudit({
    adminId,
    action: publish ? "publish" : "update",
    entityType: "editorial",
    entityId: modelYearId,
    details: { locale, publish },
  });
  revalidatePath("/admin/editorial");
  revalidatePath("/", "layout");
  redirect("/admin/editorial");
}

/** Unpublish editorial content (admin only). Keeps the draft record. */
export async function unpublishEditorial(formData: FormData) {
  const adminId = await requireRole("admin");
  if (adminId === null) return;

  const id = Number(formData.get("id"));
  await db.update(editorial).set({ published: false, updatedAt: new Date() }).where(eq(editorial.id, id));
  await logAudit({ adminId, action: "update", entityType: "editorial", entityId: id, details: { unpublished: true } });
  revalidatePath("/admin/editorial");
  revalidatePath("/", "layout");
}

/** Permanently delete editorial content (admin only). */
export async function deleteEditorial(formData: FormData) {
  const adminId = await requireRole("admin");
  if (adminId === null) return;

  const id = Number(formData.get("id"));
  await db.delete(editorial).where(eq(editorial.id, id));
  await logAudit({ adminId, action: "delete", entityType: "editorial", entityId: id });
  revalidatePath("/admin/editorial");
  revalidatePath("/", "layout");
}
