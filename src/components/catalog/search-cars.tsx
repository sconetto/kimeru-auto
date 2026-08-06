"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { ModelCard } from "@/lib/catalog/queries";
import { formatBRL, fuelLabels } from "@/lib/format";
import { Link } from "@/lib/i18n/navigation";

interface Props {
  models: ModelCard[];
}

export function SearchCars({ models }: Props) {
  const t = useTranslations("home");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return models
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.brandName.toLowerCase().includes(q) ||
          (m.category ?? "").includes(q),
      )
      .slice(0, 8);
  }, [query, models]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          aria-label={t("searchAria")}
        />
      </div>

      {focused && results.length > 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.map((model) => (
            <Link
              key={model.id}
              href={`/car/${model.slug}`}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{model.name}</p>
                <p className="text-xs text-slate-500">
                  {model.brandName}
                  {model.fuelType ? ` · ${fuelLabels[model.fuelType] ?? model.fuelType}` : ""}
                </p>
              </div>
              {model.priceFipe && (
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {formatBRL(model.priceFipe)}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
