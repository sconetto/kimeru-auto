import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { models, modelYears } from "@/lib/db/schema";
import { fuelLabels } from "@/lib/format";
import { ImportExportControls } from "@/components/admin/import-export-controls";
import { DeleteModelYearButton } from "./delete-model-year-button";

export const dynamic = "force-dynamic";

export default async function AdminModelYearsPage({
  searchParams,
}: {
  searchParams: Promise<{ modelId?: string }>;
}) {
  const { modelId } = await searchParams;
  const id = Number(modelId);
  if (!id) redirect("/admin/cars");

  const [model] = await db.select().from(models).where(eq(models.id, id)).limit(1);
  if (!model) redirect("/admin/cars");

  const years = await db
    .select()
    .from(modelYears)
    .where(eq(modelYears.modelId, id))
    .orderBy(desc(modelYears.year));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/cars" className="text-sm text-blue-400 hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{model.name} — Versões</h1>
        <p className="mt-1 text-sm text-slate-400">
          Gerencie as versões e especificações deste modelo
        </p>
        <div className="mt-3">
          <ImportExportControls entity="model-years" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Ano</th>
              <th className="px-4 py-3">Combustível</th>
              <th className="px-4 py-3">Código FIPE</th>
              <th className="px-4 py-3">0km</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.id} className="border-b border-slate-800 last:border-0">
                <td className="px-4 py-3 font-medium text-white">{y.year}</td>
                <td className="px-4 py-3 text-slate-400">{fuelLabels[y.fuelType] ?? y.fuelType}</td>
                <td className="px-4 py-3 text-slate-400">{y.fipeCode ?? "—"}</td>
                <td className="px-4 py-3 text-slate-400">{y.isZeroKm ? "Sim" : "Não"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Link
                      href={`/admin/cars/${y.id}/specs`}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                    >
                      Specs
                    </Link>
                    <Link
                      href={`/admin/model-years/${y.id}`}
                      className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
                    >
                      Editar
                    </Link>
                    <DeleteModelYearButton id={y.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {years.length === 0 && (
          <p className="p-8 text-center text-slate-500">
            Nenhuma versão cadastrada para este modelo.
          </p>
        )}
      </div>
    </div>
  );
}
