import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, vehicleCategories } from "@/lib/db/schema";
import { AiImportForm } from "./ai-import-form";

export const dynamic = "force-dynamic";

export default async function AiImportPage() {
  const [allBrands, categories] = await Promise.all([
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db
      .select({ slug: vehicleCategories.slug, name: vehicleCategories.name })
      .from(vehicleCategories)
      .orderBy(asc(vehicleCategories.displayOrder)),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-xl font-bold text-white">Importar carro com IA</h1>
      <p className="mb-6 text-sm text-slate-400">
        Cole a URL de um PDF, site ou vídeo para extrair as informações completas do carro. Revise e
        edite antes de criar.
      </p>
      <AiImportForm brands={allBrands} categories={categories} />
    </div>
  );
}
