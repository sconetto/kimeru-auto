import { asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, models, modelYears, vehicleCategories } from "@/lib/db/schema";
import { categoryLabels } from "@/lib/format";
import { ModelRow } from "./model-row";
import { NewModelForm } from "./new-model-form";

export const dynamic = "force-dynamic";

export default async function AdminCarsPage() {
  const allBrands = await db.select().from(brands).orderBy(asc(brands.name));
  const categories = await db.select().from(vehicleCategories).orderBy(asc(vehicleCategories.displayOrder));

  const rows = await db
    .select({
      id: models.id,
      name: models.name,
      slug: models.slug,
      category: models.category,
      isActive: models.isActive,
      brandId: models.brandId,
      brandName: brands.name,
      yearCount: count(modelYears.id),
    })
    .from(models)
    .innerJoin(brands, eq(brands.id, models.brandId))
    .leftJoin(modelYears, eq(modelYears.modelId, models.id))
    .groupBy(models.id, brands.name)
    .orderBy(asc(brands.name), asc(models.name));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Veículos</h1>
        <p className="mt-1 text-sm text-slate-400">Gerencie modelos e versões do catálogo</p>
      </div>

      <NewModelForm brands={allBrands} categories={categories} />

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Versões</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ModelRow
                key={row.id}
                model={{
                  ...row,
                  categoryLabel: row.category
                    ? (categoryLabels[row.category] ?? row.category)
                    : "—",
                }}
              />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-slate-500">Nenhum modelo cadastrado.</p>
        )}
      </div>
    </div>
  );
}
