import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { brands, models, vehicleCategories } from "@/lib/db/schema";
import { ModelEditForm } from "./model-edit-form";

export const dynamic = "force-dynamic";

export default async function EditModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modelId = Number(id);

  const [model] = await db.select().from(models).where(eq(models.id, modelId)).limit(1);
  if (!model) redirect("/admin/cars");

  const [allBrands, categories] = await Promise.all([
    db.select().from(brands).orderBy(asc(brands.name)),
    db.select().from(vehicleCategories).orderBy(asc(vehicleCategories.displayOrder)),
  ]);

  return (
    <div className="space-y-6">
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
    </div>
  );
}
