import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fipeHistory, fuelType, modelYears } from "@/lib/db/schema";
import { fuelLabels } from "@/lib/format";
import { updateModelYear } from "../../cars/actions";

export const dynamic = "force-dynamic";

export default async function AdminEditModelYearPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const yearId = Number(id);
  const [my] = await db.select().from(modelYears).where(eq(modelYears.id, yearId)).limit(1);
  if (!my) notFound();

  const history = await db
    .select()
    .from(fipeHistory)
    .where(eq(fipeHistory.modelYearId, yearId))
    .orderBy(desc(fipeHistory.recordedAt))
    .limit(10);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/admin/model-years?modelId=0" className="text-sm text-blue-400 hover:underline">
          ← Voltar para versões
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Editar versão</h1>
        <p className="mt-1 text-sm text-slate-400">
          Ano {my.year} · {fuelLabels[my.fuelType] ?? my.fuelType}
        </p>
      </div>

      <form
        action={updateModelYear}
        className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-5"
      >
        <input type="hidden" name="id" value={my.id} />
        <div>
          <label htmlFor="year" className="mb-1.5 block text-sm font-medium text-slate-300">
            Ano
          </label>
          <input
            id="year"
            name="year"
            type="number"
            required
            min={1980}
            max={2100}
            defaultValue={my.year}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="fuelType" className="mb-1.5 block text-sm font-medium text-slate-300">
            Combustível
          </label>
          <select
            id="fuelType"
            name="fuelType"
            defaultValue={my.fuelType}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            {fuelType.enumValues.map((f) => (
              <option key={f} value={f}>
                {fuelLabels[f] ?? f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fipeCode" className="mb-1.5 block text-sm font-medium text-slate-300">
            Código FIPE
          </label>
          <input
            id="fipeCode"
            name="fipeCode"
            defaultValue={my.fipeCode ?? ""}
            placeholder="ex: 001004-0"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="priceFipe" className="mb-1.5 block text-sm font-medium text-slate-300">
            Preço FIPE (R$)
          </label>
          <input
            id="priceFipe"
            name="priceFipe"
            defaultValue={my.priceFipe ?? ""}
            placeholder="ex: 85000,00"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" name="isZeroKm" defaultChecked={my.isZeroKm} className="h-4 w-4" />
          Versão 0km
        </label>
        <button
          type="submit"
          title="Salvar alterações"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Salvar alterações
        </button>
      </form>

      {history.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-medium text-white">Histórico de preços FIPE</h2>
          <ul className="space-y-1.5 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between text-slate-400">
                <span className="capitalize">{h.referenceMonth}</span>
                <span className="font-medium text-white">
                  {Number(h.price).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
