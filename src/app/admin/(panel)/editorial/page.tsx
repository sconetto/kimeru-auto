import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, editorial, models, modelYears } from "@/lib/db/schema";
import { EditorialPanel } from "./editorial-panel";

export const dynamic = "force-dynamic";

export default async function AdminEditorialPage() {
  const rows = await db
    .select({
      modelYearId: modelYears.id,
      modelName: models.name,
      brandName: brands.name,
      year: modelYears.year,
    })
    .from(modelYears)
    .innerJoin(models, eq(models.id, modelYears.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .orderBy(asc(brands.name), asc(models.name), desc(modelYears.year));

  const staged = await db
    .select({ modelYearId: editorial.modelYearId, locale: editorial.locale })
    .from(editorial)
    .where(and(eq(editorial.published, false), eq(editorial.aiGenerated, true)));

  const stagedKeys = new Set(staged.map((s) => `${s.modelYearId}:${s.locale}`));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Conteúdo editorial</h1>
        <p className="mt-1 text-sm text-slate-400">
          Gere conteúdo com IA a partir de reviews no YouTube e publique após revisão.
        </p>
      </div>

      <EditorialPanel cars={rows} stagedKeys={stagedKeys} />
    </div>
  );
}
