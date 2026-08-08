import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getScaledScore, specScaleMap } from "@/lib/compare/spec-scale";
import { db } from "@/lib/db";
import { specCategories, specValues } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  values: z.array(
    z.object({
      categoryId: z.number().int().positive(),
      value: z.string().max(500),
      numericValue: z.string().nullable().optional(),
    }),
  ),
});

/** POST /api/admin/spec-values/[modelYearId] — upsert spec values for a model year. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ modelYearId: string }> },
) {
  const guard = await requireAdmin({ minRole: "editor" });
  if (!guard.ok) return guard.response;
  const session = guard.session;

  const { modelYearId } = await params;
  const id = Number(modelYearId);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // Resolve spec category slugs once so scaled (non-numeric) specs can be
  // auto-scored from their text value via the quality scale map.
  const categoryRows = await db
    .select({ id: specCategories.id, slug: specCategories.slug })
    .from(specCategories);
  const slugById = new Map(categoryRows.map((c) => [c.id, c.slug]));

  for (const v of parsed.data.values) {
    const categorySlug = slugById.get(v.categoryId);
    // Explicit admin value wins (override); otherwise auto-score scaled specs.
    const numericValue =
      v.numericValue != null
        ? v.numericValue
        : categorySlug && specScaleMap[categorySlug]
          ? String(getScaledScore(categorySlug, v.value))
          : v.numericValue;

    const existing = await db
      .select()
      .from(specValues)
      .where(and(eq(specValues.modelYearId, id), eq(specValues.specCategoryId, v.categoryId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(specValues)
        .set({
          value: v.value,
          numericValue,
          displayValue: v.value,
          updatedAt: new Date(),
        })
        .where(eq(specValues.id, existing[0].id));
    } else {
      await db.insert(specValues).values({
        modelYearId: id,
        specCategoryId: v.categoryId,
        value: v.value,
        numericValue,
        displayValue: v.value,
      });
    }
  }

  await logAudit({
    adminId: session.id,
    action: "update",
    entityType: "spec_values",
    entityId: id,
    details: { count: parsed.data.values.length },
  });

  return NextResponse.json({ ok: true, count: parsed.data.values.length });
}
