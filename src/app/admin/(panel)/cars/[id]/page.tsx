import { asc, desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  brands,
  models,
  modelYears,
  specCategories,
  specValues,
  vehicleCategories,
} from "@/lib/db/schema";
import { ModelEditForm } from "./model-edit-form";
import { ModelYearCard } from "./model-year-card";
import { NewModelYearForm } from "./new-model-year-form";

export const dynamic = "force-dynamic";

export default async function EditModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modelId = Number(id);

  const [model] = await db.select().from(models).where(eq(models.id, modelId)).limit(1);
  if (!model) redirect("/admin/cars");

  const [allBrands, categories, specCats, years] = await Promise.all([
    db.select().from(brands).orderBy(asc(brands.name)),
    db.select().from(vehicleCategories).orderBy(asc(vehicleCategories.displayOrder)),
    db.select().from(specCategories).orderBy(specCategories.group, specCategories.displayOrder),
    db
      .select()
      .from(modelYears)
      .where(eq(modelYears.modelId, modelId))
      .orderBy(desc(modelYears.year)),
  ]);

  const yearIds = years.map((y) => y.id);
  const specs = yearIds.length
    ? await db.select().from(specValues).where(inArray(specValues.modelYearId, yearIds))
    : [];

  const specsByYear = new Map<number, (typeof specs)[number][]>();
  for (const s of specs) {
    const arr = specsByYear.get(s.modelYearId) ?? [];
    arr.push(s);
    specsByYear.set(s.modelYearId, arr);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Editar modelo</h1>
        <p className="mt-1 text-sm text-slate-400">{model.name}</p>
      </div>

      <ModelEditForm
        model={{
          id: model.id,
          brandId: model.brandId,
          name: model.name,
          category: model.category,
          sizeCategory: model.sizeCategory,
          imageUrl: model.imageUrl,
          isActive: model.isActive,
        }}
        brands={allBrands}
        categories={categories}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Versões e especificações</h2>
        {years.length === 0 && (
          <p className="rounded-lg border border-slate-800 bg-slate-900 p-5 text-sm text-slate-500">
            Nenhuma versão cadastrada. Adicione a primeira abaixo.
          </p>
        )}
        {years.map((y) => (
          <ModelYearCard
            key={y.id}
            year={y}
            categories={specCats}
            existing={specsByYear.get(y.id) ?? []}
          />
        ))}
      </section>

      <NewModelYearForm modelId={modelId} />
    </div>
  );
}
