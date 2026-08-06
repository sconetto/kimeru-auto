import { desc, eq, sum } from "drizzle-orm";
import { Truck } from "lucide-react";
import { db } from "@/lib/db";
import { brands, models, modelYears, salesRankings } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Top-level aggregate for the current month
  const [monthlyTotal] = await db
    .select({ total: sum(salesRankings.unitsSold).mapWith(Number) })
    .from(salesRankings)
    .where(eq(salesRankings.month, currentMonth));

  // Available months for the filter (not yet wired—placeholder for future)
  const availableMonths = await db
    .selectDistinct({
      month: salesRankings.month,
      year: salesRankings.year,
    })
    .from(salesRankings)
    .orderBy(desc(salesRankings.year), desc(salesRankings.month));

  // Current month rankings: model + brand + units
  const rankings = await db
    .select({
      brandName: brands.name,
      modelName: models.name,
      modelYear: modelYears.year,
      unitsSold: salesRankings.unitsSold,
      position: salesRankings.rankingPosition,
    })
    .from(salesRankings)
    .innerJoin(modelYears, eq(salesRankings.modelYearId, modelYears.id))
    .innerJoin(models, eq(modelYears.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .where(eq(salesRankings.month, currentMonth))
    .orderBy(desc(salesRankings.unitsSold));

  // By-brand aggregate (all months)
  const brandTotals = await db
    .select({
      brandName: brands.name,
      total: sum(salesRankings.unitsSold).mapWith(Number),
    })
    .from(salesRankings)
    .innerJoin(modelYears, eq(salesRankings.modelYearId, modelYears.id))
    .innerJoin(models, eq(modelYears.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .groupBy(brands.name)
    .orderBy(desc(sum(salesRankings.unitsSold)));

  const hasData = rankings.length > 0;
  const latestMonth = availableMonths[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Vendas (FENABRAVE)</h1>
        <p className="mt-1 text-sm text-slate-400">
          Rankings mensais de emplacamentos por modelo — dados oficiais da FENABRAVE
        </p>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 p-16 text-center">
          <Truck className="mb-4 h-12 w-12 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-300">Nenhum dado importado</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Acesse{" "}
            <a href="/admin/imports" className="text-blue-400 underline hover:text-blue-300">
              Importar dados
            </a>{" "}
            para carregar os rankings FENABRAVE de um arquivo XLSX.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total emplacamentos
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {monthlyTotal?.total?.toLocaleString("pt-BR") ?? "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {latestMonth
                  ? `${latestMonth.month}/${latestMonth.year}`
                  : `${currentMonth}/${currentYear}`}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Modelos ranqueados
              </p>
              <p className="mt-2 text-2xl font-bold text-white">{rankings.length}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Líder do mês
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {rankings[0]?.brandName ?? "—"}{" "}
                <span className="text-lg font-normal text-slate-400">
                  {rankings[0]?.modelName ?? ""}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {rankings[0] ? `${rankings[0].unitsSold?.toLocaleString("pt-BR")} unidades` : "—"}
              </p>
            </div>
          </div>

          {/* Monthly ranking table */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Ranking de{" "}
              {latestMonth
                ? `${latestMonth.month}/${latestMonth.year}`
                : `${currentMonth}/${currentYear}`}
            </h2>
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="w-12 px-4 py-3 text-center">#</th>
                    <th className="px-4 py-3">Modelo</th>
                    <th className="px-4 py-3">Marca</th>
                    <th className="px-4 py-3">Ano</th>
                    <th className="px-4 py-3 text-right">Emplacamentos</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((row, i) => (
                    <tr
                      key={`${row.brandName}-${row.modelName}`}
                      className="border-b border-slate-800/50 last:border-0"
                    >
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            i === 0
                              ? "bg-yellow-600/20 text-yellow-400"
                              : i === 1
                                ? "bg-slate-600/20 text-slate-300"
                                : i === 2
                                  ? "bg-amber-700/20 text-amber-500"
                                  : "text-slate-500"
                          }`}
                        >
                          {row.position ?? i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200">{row.modelName}</td>
                      <td className="px-4 py-3 text-slate-400">{row.brandName}</td>
                      <td className="px-4 py-3 text-slate-400">{row.modelYear}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-200">
                        {row.unitsSold?.toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Brand aggregate table */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Total por marca (todos os meses)
            </h2>
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Marca</th>
                    <th className="px-4 py-3 text-right">Total emplacamentos</th>
                  </tr>
                </thead>
                <tbody>
                  {brandTotals.map((row) => (
                    <tr key={row.brandName} className="border-b border-slate-800/50 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-200">{row.brandName}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-200">
                        {row.total?.toLocaleString("pt-BR") ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
