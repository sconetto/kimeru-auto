import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { models, modelYears, specCategories, specValues } from "@/lib/db/schema";
import { SpecValuesEditor } from "./spec-values-editor";

export const dynamic = "force-dynamic";

export default async function SpecValuesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: modelYearId } = await params;
  const id = Number(modelYearId);

  const [my] = await db
    .select({
      id: modelYears.id,
      year: modelYears.year,
      fuelType: modelYears.fuelType,
      modelName: models.name,
    })
    .from(modelYears)
    .innerJoin(models, eq(models.id, modelYears.modelId))
    .where(eq(modelYears.id, id))
    .limit(1);

  if (!my) redirect("/admin/cars");

  const categories = await db
    .select()
    .from(specCategories)
    .orderBy(specCategories.group, specCategories.displayOrder);
  const existing = await db.select().from(specValues).where(eq(specValues.modelYearId, id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {my.modelName} {my.year} — Especificações
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Preencha os valores de cada categoria de especificação para este modelo.
        </p>
      </div>

      <SpecValuesEditor modelYearId={id} categories={categories} existing={existing} />
    </div>
  );
}
