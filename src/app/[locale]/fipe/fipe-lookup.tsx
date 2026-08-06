"use client";

import { Search, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  type FipeBrand,
  type FipeModel,
  type FipePriceParsed,
  type FipeYear,
  fipeClient,
} from "@/lib/fipe/client";
import { formatBRL } from "@/lib/format";

type Step = "idle" | "loading" | "error" | "success";

export function FipeLookup() {
  const t = useTranslations("fipe");
  const [brands, setBrands] = useState<FipeBrand[]>([]);
  const [models, setModels] = useState<FipeModel[]>([]);
  const [years, setYears] = useState<FipeYear[]>([]);

  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [yearId, setYearId] = useState("");

  const [price, setPrice] = useState<FipePriceParsed | null>(null);
  const [allPrices, setAllPrices] = useState<FipePriceParsed[]>([]);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fipeClient
      .getBrands("cars")
      .then((b) => setBrands(b))
      .catch(() => setError(t("errorBrands")));
  }, [t]);

  async function handleBrandChange(id: string) {
    setBrandId(id);
    setModelId("");
    setYearId("");
    setPrice(null);
    setAllPrices([]);
    setStep("idle");
    setModels([]);
    setYears([]);
    if (!id) return;
    try {
      const m = await fipeClient.getModels(Number(id));
      setModels(m);
    } catch {
      setError(t("errorModels"));
    }
  }

  async function handleModelChange(id: string) {
    setModelId(id);
    setYearId("");
    setPrice(null);
    setAllPrices([]);
    setStep("idle");
    setYears([]);
    if (!id || !brandId) return;
    try {
      const y = await fipeClient.getYears(Number(brandId), Number(id));
      setYears(y);
    } catch {
      setError(t("errorYears"));
    }
  }

  async function handleSearch() {
    if (!brandId || !modelId || !yearId) return;
    setStep("loading");
    setError(null);
    setAllPrices([]);
    try {
      // Single server-side call — fetches all years' prices, avoiding N FIPE API calls from the browser
      const res = await fetch(`/api/fipe/all-prices?brandId=${brandId}&modelId=${modelId}`);
      if (!res.ok) throw new Error("FIPE unavailable");
      const { prices } = (await res.json()) as { prices: FipePriceParsed[] };
      const selected = prices.find((p) => p.yearCode === yearId) ?? prices[0];
      setPrice(selected ?? null);
      setAllPrices(prices);
      setStep("success");
    } catch {
      setStep("error");
      setError(t("errorPrice"));
    }
  }

  const canSearch = Boolean(brandId && modelId && yearId);

  function formatYearLabel(y: FipeYear): string {
    return y.name.replace(/^32000/, "0km");
  }

  // Sort 0km to top, used-car years descending
  const sortedYears = [...years].sort((a, b) => {
    const aIsZero = a.code.startsWith("32000");
    const bIsZero = b.code.startsWith("32000");
    if (aIsZero && !bIsZero) return -1;
    if (!aIsZero && bIsZero) return 1;
    return b.name.localeCompare(a.name);
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      {/* Selectors */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="fipe-brand"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {t("brand")}
          </label>
          <select
            id="fipe-brand"
            value={brandId}
            onChange={(e) => handleBrandChange(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{t("selectBrand")}</option>
            {brands.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="fipe-model"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {t("model")}
          </label>
          <select
            id="fipe-model"
            value={modelId}
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={models.length === 0}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{t("selectModel")}</option>
            {models.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="fipe-year"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {t("year")}
          </label>
          <select
            id="fipe-year"
            value={yearId}
            onChange={(e) => setYearId(e.target.value)}
            disabled={years.length === 0}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{t("selectYear")}</option>
            <optgroup label={t("zeroKmGroup")}>
              {sortedYears
                .filter((y) => y.code.startsWith("32000"))
                .map((y) => (
                  <option key={y.code} value={y.code}>
                    {formatYearLabel(y)}
                  </option>
                ))}
            </optgroup>
            <optgroup label={t("usedGroup")}>
              {sortedYears
                .filter((y) => !y.code.startsWith("32000"))
                .map((y) => (
                  <option key={y.code} value={y.code}>
                    {formatYearLabel(y)}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSearch}
        disabled={!canSearch || step === "loading"}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Search className="h-4 w-4" />
        {step === "loading" ? t("searching") : t("search")}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {/* Result */}
      {step === "success" && price && (
        <>
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-5 dark:border-blue-500/30 dark:bg-blue-500/10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {price.brand} {price.model}
                </p>
                <p className="text-xs text-slate-500">
                  {price.isZeroKm ? "0km" : `${price.modelYear} · ${price.fuel}`}
                </p>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {formatBRL(price.price)}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 border-t border-blue-200 pt-3 text-xs text-slate-500 dark:border-blue-500/30">
              <span>
                {t("referenceMonth")}: <strong>{price.referenceMonth}</strong>
              </span>
              <span>
                {t("fipeCode")}: <strong>{price.fipeCode}</strong>
              </span>
            </div>
          </div>

          {/* Depreciation chart */}
          {allPrices.length > 1 && (
            <div className="mt-6">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <TrendingDown className="h-4 w-4" />
                {t("depreciationTitle")}
              </h3>
              <div className="space-y-2">
                {[...allPrices]
                  .sort((a, b) => b.price - a.price)
                  .map((p) => {
                    const maxPrice = Math.max(...allPrices.map((x) => x.price));
                    const pct = maxPrice > 0 ? ((p.price / maxPrice) * 100).toFixed(0) : "—";
                    const isZeroKm = p.isZeroKm;
                    return (
                      <div key={p.modelYear + p.fuel} className="flex items-center gap-3">
                        <span
                          className={`w-16 shrink-0 text-right text-xs ${isZeroKm ? "font-semibold" : ""} text-slate-600 dark:text-slate-400`}
                        >
                          {isZeroKm ? "0km" : p.modelYear}
                        </span>
                        <div className="relative h-5 flex-1 rounded-sm bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-sm ${isZeroKm ? "bg-blue-500" : "bg-blue-400/60"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-xs tabular-nums text-slate-700 dark:text-slate-300">
                          {formatBRL(p.price)}
                        </span>
                        <span className="w-12 text-right text-xs text-slate-400">{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
