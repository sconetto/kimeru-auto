import { and, eq, sum } from "drizzle-orm";
import { Truck } from "lucide-react";
import {
  availableSalesPeriods,
  getBrandYearToDate,
  getSalesRankings,
  getSalesYearToDate,
} from "@/lib/catalog/queries";
import { db } from "@/lib/db";
import { salesRankings } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const YTD_LIMIT = 10;

export default async function AnalyticsPage() {
  const periods = await availableSalesPeriods();

  if (periods.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Vendas (FENABRAVE)</h1>
          <p className="mt-1 text-sm text-slate-400">
            Rankings mensais de emplacamentos por modelo. Dados oficiais da FENABRAVE
          </p>
        </div>
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
      </div>
    );
  }

  const latestMonth = periods[0];

  const [monthlyTotalRows, rankings, yearToDate, brandYearToDate] = await Promise.all([
    db
      .select({ total: sum(salesRankings.unitsSold).mapWith(Number) })
      .from(salesRankings)
      .where(
        and(eq(salesRankings.year, latestMonth.year), eq(salesRankings.month, latestMonth.month)),
      ),
    getSalesRankings(latestMonth),
    getSalesYearToDate(latestMonth.year),
    getBrandYearToDate(latestMonth.year),
  ]);

  const monthlyTotal = monthlyTotalRows[0];
  const periodLabel = `${latestMonth.month}/${latestMonth.year}`;
  const monthsImported = periods.filter((period) => period.year === latestMonth.year).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Vendas (FENABRAVE)</h1>
        <p className="mt-1 text-sm text-slate-400">
          Rankings mensais de emplacamentos por modelo. Dados oficiais da FENABRAVE
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total emplacamentos
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {monthlyTotal?.total?.toLocaleString("pt-BR") ?? "Não informado"}
          </p>
          <p className="mt-1 text-xs text-slate-500">{periodLabel}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Modelos ranqueados
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{rankings.length}</p>
          <p className="mt-1 text-xs text-slate-500">{periodLabel}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Líder do mês</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {rankings[0]?.brandName ?? "Não informado"}{" "}
            <span className="text-lg font-normal text-slate-400">
              {rankings[0]?.modelName ?? ""}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {rankings[0]
              ? `${rankings[0].unitsSold?.toLocaleString("pt-BR")} unidades`
              : "Não informado"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Meses importados em {latestMonth.year}
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{monthsImported}</p>
          <p className="mt-1 text-xs text-slate-500">
            {periods
              .filter((period) => period.year === latestMonth.year)
              .map((period) => period.month)
              .sort((a, b) => a - b)
              .join(", ")}
          </p>
        </div>
      </div>

      {/* Monthly ranking table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Ranking de {periodLabel}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="w-12 px-4 py-3 text-center">#</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Marca</th>
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
                      {row.rankingPosition}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-200">{row.modelName}</td>
                  <td className="px-4 py-3 text-slate-400">{row.brandName}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-200">
                    {row.unitsSold?.toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Year-to-date */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Modelos: {latestMonth.year} até agora
          </h2>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3 text-right">Meses</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {yearToDate.slice(0, YTD_LIMIT).map((row) => (
                  <tr key={row.modelId} className="border-b border-slate-800/50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {row.modelName}
                      <span className="ml-2 text-xs text-slate-500">{row.brandName}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">{row.monthsCounted}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-200">
                      {row.unitsSold.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Marcas: {latestMonth.year} até agora
          </h2>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Marca</th>
                  <th className="px-4 py-3 text-right">Meses</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {brandYearToDate.slice(0, YTD_LIMIT).map((row) => (
                  <tr key={row.brandName} className="border-b border-slate-800/50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-200">{row.brandName}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{row.monthsCounted}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-200">
                      {row.unitsSold.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
