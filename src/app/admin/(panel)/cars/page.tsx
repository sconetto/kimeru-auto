import { asc, eq } from "drizzle-orm";
import { ImportExportControls } from "@/components/admin/import-export-controls";
import { db } from "@/lib/db";
import { brands, models, modelVersions, vehicleCategories } from "@/lib/db/schema";
import { categoryLabels } from "@/lib/format-labels";
import { CarsTable } from "./cars-table";
import { NewModelForm } from "./new-model-form";

export const dynamic = "force-dynamic";

export default async function AdminCarsPage() {
  const [allBrands, categories, modelRows, versionRows] = await Promise.all([
    db.select().from(brands).orderBy(asc(brands.name)),
    db.select().from(vehicleCategories).orderBy(asc(vehicleCategories.displayOrder)),
    db
      .select({
        id: models.id,
        name: models.name,
        slug: models.slug,
        category: models.category,
        isActive: models.isActive,
        brandId: models.brandId,
        brandName: brands.name,
      })
      .from(models)
      .innerJoin(brands, eq(brands.id, models.brandId))
      .orderBy(asc(brands.name), asc(models.name)),
    db
      .select({
        id: modelVersions.id,
        modelId: modelVersions.modelId,
        name: modelVersions.name,
        slug: modelVersions.slug,
      })
      .from(modelVersions)
      .orderBy(asc(modelVersions.name)),
  ]);

  const versionsByModel = new Map<number, { id: number; name: string; slug: string }[]>();
  for (const v of versionRows) {
    const list = versionsByModel.get(v.modelId) ?? [];
    list.push({ id: v.id, name: v.name, slug: v.slug });
    versionsByModel.set(v.modelId, list);
  }

  const modelsList = modelRows.map((m) => ({
    ...m,
    yearCount: 0,
    categoryLabel: m.category ? (categoryLabels[m.category] ?? m.category) : "Não informado",
    versions: versionsByModel.get(m.id) ?? [],
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Veículos</h1>
        <p className="mt-1 text-sm text-slate-400">Organize modelos e versões do catálogo.</p>
        <div className="mt-3">
          <ImportExportControls entity="models" />
        </div>
      </div>

      <NewModelForm brands={allBrands} categories={categories} />

      <CarsTable models={modelsList} />
    </div>
  );
}
