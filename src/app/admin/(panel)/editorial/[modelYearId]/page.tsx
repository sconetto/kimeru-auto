import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { adminUsers, brands, editorial, models, modelYears } from "@/lib/db/schema";
import { EditorialEditForm } from "../editorial-edit-form";

export const dynamic = "force-dynamic";

export default async function AdminEditEditorialPage({
  params,
}: {
  params: Promise<{ modelYearId: string }>;
}) {
  const { modelYearId } = await params;
  const myId = Number(modelYearId);
  if (Number.isNaN(myId)) notFound();

  const [modelYear] = await db
    .select({
      id: modelYears.id,
      year: modelYears.year,
      modelName: models.name,
      brandName: brands.name,
    })
    .from(modelYears)
    .innerJoin(models, eq(models.id, modelYears.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .where(eq(modelYears.id, myId))
    .limit(1);
  if (!modelYear) notFound();

  const [existing] = await db
    .select()
    .from(editorial)
    .where(and(eq(editorial.modelYearId, myId), eq(editorial.locale, "pt-BR")))
    .limit(1);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/editorial" className="text-sm text-blue-400 hover:underline">
          ← Voltar para conteúdo editorial
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">
          Editar conteúdo — {modelYear.brandName} {modelYear.modelName} {modelYear.year}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {existing?.published ? "Publicado" : "Rascunho"} ·{" "}
          {existing ? "edite e salve as alterações" : "nenhum conteúdo ainda — salve para criar"}
        </p>
      </div>

      <EditorialEditForm modelYearId={myId} editorial={existing ?? null} />
    </div>
  );
}
