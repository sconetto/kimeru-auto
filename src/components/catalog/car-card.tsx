import { getTranslations } from "next-intl/server";
import type { ModelCard } from "@/lib/catalog/queries";
import { formatBRL, fuelLabels } from "@/lib/format";
import { Link } from "@/lib/i18n/navigation";

interface Props {
  model: ModelCard;
  href?: string;
  locale?: string;
}

export async function CarCard({ model, href, locale = "pt-BR" }: Props) {
  const t = await getTranslations({ locale, namespace: "catalog" });
  const link = href ?? `/car/${model.slug}`;

  return (
    <Link
      href={link}
      className="group block rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {model.brandName}
          </p>
          <h3 className="mt-0.5 font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
            {model.name}
          </h3>
        </div>
        {model.rankingPosition && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
            #{model.rankingPosition}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          {model.priceFipe ? (
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {formatBRL(model.priceFipe)}
            </p>
          ) : (
            <p className="text-sm text-slate-400">{t("priceOnRequest")}</p>
          )}
          {model.year && model.fuelType && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {model.year} · {fuelLabels[model.fuelType] ?? model.fuelType}
              {model.unitsSold
                ? ` · ${t("sold", { count: model.unitsSold.toLocaleString("pt-BR") })}`
                : ""}
            </p>
          )}
        </div>
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 opacity-0 transition-opacity group-hover:opacity-100">
          {t("view")} →
        </span>
      </div>
    </Link>
  );
}
