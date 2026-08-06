import { asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, models } from "@/lib/db/schema";
import { BrandRow } from "./brand-row";
import { NewBrandForm } from "./new-brand-form";

export const dynamic = "force-dynamic";

export default async function AdminBrandsPage() {
  const rows = await db
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      originCountry: brands.originCountry,
      isActive: brands.isActive,
      modelCount: count(models.id),
    })
    .from(brands)
    .leftJoin(models, eq(models.brandId, brands.id))
    .groupBy(brands.id)
    .orderBy(asc(brands.name));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Marcas</h1>
        <p className="mt-1 text-sm text-slate-400">Gerencie as marcas do catálogo</p>
      </div>

      <NewBrandForm />

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">País</th>
              <th className="px-4 py-3">Modelos</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <BrandRow key={row.id} brand={row} />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-slate-500">Nenhuma marca cadastrada.</p>
        )}
      </div>
    </div>
  );
}
