import { TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSalesRankings } from "@/lib/catalog/queries";
import { categoryLabels, fuelLabels } from "@/lib/format";
import { Link } from "@/lib/i18n/navigation";

export const revalidate = 3600;

export default async function MaisVendidosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sales" });
  const rankings = await getSalesRankings().catch(() => []);

  if (rankings.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <TrendingUp className="mx-auto mb-4 h-10 w-10 text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="mt-3 text-slate-500">{t("empty")}</p>
      </div>
    );
  }

  const { month, year } = rankings[0];
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(locale, { month: "long" });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-slate-500">{t("subtitle", { month: monthLabel, year })}</p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">{t("vehicle")}</th>
              <th className="px-4 py-3">{t("category")}</th>
              <th className="px-4 py-3 text-right">{t("registrations")}</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((row, i) => (
              <tr
                key={row.modelYearId}
                className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                  i < 3 ? "bg-amber-50/50 dark:bg-amber-500/5" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                      i === 0
                        ? "bg-amber-400 text-white"
                        : i === 1
                          ? "bg-slate-300 text-slate-800"
                          : i === 2
                            ? "bg-orange-300 text-white"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/car/${row.modelSlug}`}
                    className="font-medium text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                  >
                    {row.brandName} {row.modelName}
                  </Link>
                  <span className="ml-2 text-xs text-slate-400">
                    {fuelLabels[row.category ?? ""] ?? ""}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {row.category ? (categoryLabels[row.category] ?? row.category) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                  {row.unitsSold.toLocaleString(locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">{t("source")}</p>
    </div>
  );
}
