import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { editorial } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  modelYearId: z.number().int().positive(),
  locale: z.enum(["pt-BR", "en-US"]),
  content: z.object({
    pros: z.array(z.string().max(200)).max(5),
    cons: z.array(z.string().max(200)).max(5),
    summary: z.string().max(2000),
    rating: z.number().min(1).max(5),
  }),
});

/** POST /api/admin/editorial/publish — persist reviewed editorial content. */
export async function POST(request: Request) {
  const guard = await requireAdmin({ minRole: "editor" });
  if (!guard.ok) return guard.response;
  const session = guard.session;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { modelYearId, locale, content } = parsed.data;

  const existing = await db
    .select()
    .from(editorial)
    .where(and(eq(editorial.modelYearId, modelYearId), eq(editorial.locale, locale)))
    .limit(1);

  let editorialId: number;
  if (existing.length > 0) {
    await db
      .update(editorial)
      .set({
        pros: content.pros,
        cons: content.cons,
        summary: content.summary,
        rating: String(content.rating),
        aiGenerated: true,
        reviewedBy: session.id,
        published: true,
        updatedAt: new Date(),
      })
      .where(eq(editorial.id, existing[0].id));
    editorialId = existing[0].id;
  } else {
    const [inserted] = await db
      .insert(editorial)
      .values({
        modelYearId,
        locale,
        pros: content.pros,
        cons: content.cons,
        summary: content.summary,
        rating: String(content.rating),
        sourceVideos: [],
        aiGenerated: true,
        reviewedBy: session.id,
        published: true,
      })
      .returning();
    editorialId = inserted.id;
  }

  await logAudit({
    adminId: session.id,
    action: "publish",
    entityType: "editorial",
    entityId: editorialId,
    details: { modelYearId, locale },
  });

  return NextResponse.json({ ok: true, editorialId });
}
