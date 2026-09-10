"use client";

import { AlertTriangle, Calculator, Info, Link2, Plus, Star, Trophy, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/catalog/brand-logo";
import { RadarChart } from "@/components/compare/radar-chart";
import { powertrainOf } from "@/lib/catalog/powertrain";
import type { CompareCar, CompareOptionBrand, CompareOptionYear } from "@/lib/catalog/queries";
import { isConsumptionSlug, toKmPerKwh } from "@/lib/compare/consumption";
import { excludeSelectedYears } from "@/lib/compare/options";
import { bestCarIndices, computeRadarScores } from "@/lib/compare/scoring";
import { formatBRL, formatDate, formatMonthYear, formatSpecValue } from "@/lib/format";
import {
  categoryLabels,
  fuelLabels,
  powertrainLabels,
  sizeCategoryLabels,
  specGroupLabels,
} from "@/lib/format-labels";
import { Link, useRouter } from "@/lib/i18n/navigation";

// Matches the RadarChart color palette so legend dots align with the graph.
const RADAR_COLORS = ["#2563eb", "#059669", "#d97706"];

interface Props {
  initialCars: CompareCar[];
}

const MAX_CARS = 3;

interface RowValue {
  value: string | null;
  numericValue: string | number | null;
  originalValue?: string | null;
  originalUnit?: string | null;
}

export function CompareClient({ initialCars }: Props) {
  const t = useTranslations("compare");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [cars, setCars] = useState<CompareCar[]>(initialCars);
  const [error, setError] = useState<string | null>(null);

  const carsIds = cars.map((c) => c.modelYearId).join(",");
  const initialIds = initialCars.map((c) => c.modelYearId).join(",");
  useEffect(() => {
    if (initialIds !== carsIds) {
      setCars(initialCars);
    }
  }, [initialIds, carsIds, initialCars]);

  /* ---------------- Car selection ---------------- */

  const addCar = (modelYearId: number) => {
    if (cars.length >= MAX_CARS) {
      setError(t("maxCars"));
      return;
    }
    if (cars.some((c) => c.modelYearId === modelYearId)) {
      setError(t("alreadyAdded"));
      return;
    }
    const next = [...cars.map((c) => c.modelYearId), modelYearId];
    router.push(`/compare?cars=${next.join(",")}`);
    setError(null);
  };

  const removeCar = (modelYearId: number) => {
    const next = cars.filter((c) => c.modelYearId !== modelYearId);
    router.push(
      next.length > 0 ? `/compare?cars=${next.map((c) => c.modelYearId).join(",")}` : `/compare`,
    );
    setError(null);
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?cars=${cars.map((c) => c.modelYearId).join(",")}`;
    try {
      await navigator.clipboard.writeText(url);
      setError(null);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setError(null);
    }
  };
  const [shareCopied, setShareCopied] = useState(false);

  /* ---------------- Build comparison matrix ---------------- */

  const matrix = useMemo(() => {
    if (cars.length === 0) return { groups: [] as { group: string; rows: Row[] }[] };

    interface Row {
      name: string;
      unit: string | null;
      higherIsBetter: boolean;
      isNumeric: boolean;
      isConsumption: boolean;
      values: RowValue[];
      bestIndexes: number[];
      isTie: boolean;
    }

    const categories = new Map<
      string,
      {
        name: string;
        unit: string | null;
        higherIsBetter: boolean;
        isNumeric: boolean;
        group: string;
      }
    >();
    for (const car of cars) {
      for (const group of car.specs) {
        for (const spec of group.specs) {
          if (!categories.has(spec.slug)) {
            const isConsumption = isConsumptionSlug(spec.slug);
            categories.set(spec.slug, {
              name: spec.name,
              unit: isConsumption ? "km/kWh" : spec.unit,
              higherIsBetter: isConsumption ? true : spec.higherIsBetter,
              isNumeric: spec.isNumeric,
              group: group.group,
            });
          }
        }
      }
    }

    const numericValue = (car: CompareCar, slug: string): number => {
      for (const g of car.specs) {
        for (const s of g.specs) {
          if (s.slug !== slug) continue;
          if (s.numericValue != null) {
            const n = Number(s.numericValue);
            if (!Number.isNaN(n)) return n;
          }
          const v = s.displayValue ?? s.value;
          if (v != null) {
            const n = Number(String(v).replace(/[^\d.-]/g, ""));
            if (!Number.isNaN(n)) return n;
          }
          return NaN;
        }
      }
      return NaN;
    };

    const groups = new Map<string, Row[]>();
    for (const [slug, meta] of categories) {
      const isConsumption = isConsumptionSlug(slug);
      const values = cars.map((car) => {
        if (isConsumption) {
          const kmPerKwh = toKmPerKwh(slug, numericValue(car, slug));
          const spec = car.specs.flatMap((g) => g.specs).find((s) => s.slug === slug);
          return {
            value: null,
            numericValue:
              kmPerKwh != null && Number.isFinite(kmPerKwh) ? Number(kmPerKwh.toFixed(2)) : null,
            originalValue: spec?.displayValue ?? spec?.value ?? null,
            originalUnit: spec?.unit ?? null,
          };
        }
        const group = car.specs.find((g) => g.group === meta.group);
        const spec = group?.specs.find((s) => s.slug === slug);
        return {
          value: spec?.displayValue ?? spec?.value ?? null,
          numericValue: spec?.numericValue ?? null,
        };
      });

      let bestIndexes: number[] = [];
      let isTie = false;
      if (meta.isNumeric) {
        const nums = cars.map((car) => {
          const raw = numericValue(car, slug);
          if (Number.isNaN(raw)) return NaN;
          return isConsumption ? (toKmPerKwh(slug, raw) ?? NaN) : raw;
        });
        const valid = nums.filter((n) => !Number.isNaN(n));
        if (valid.length > 0) {
          const best = meta.higherIsBetter ? Math.max(...valid) : Math.min(...valid);
          bestIndexes = nums.map((n, i) => (n === best ? i : -1)).filter((i) => i >= 0);
          isTie = bestIndexes.length > 1;
        }
      }

      const rows = groups.get(meta.group) ?? [];
      rows.push({
        name: meta.name,
        unit: meta.unit,
        higherIsBetter: meta.higherIsBetter,
        isNumeric: meta.isNumeric,
        isConsumption,
        values,
        bestIndexes,
        isTie,
      });
      groups.set(meta.group, rows);
    }

    return { groups: [...groups.entries()].map(([group, rows]) => ({ group, rows })) };
  }, [cars]);

  /* ---------------- Radar overview (best car by specs) ---------------- */

  const radarScores = useMemo(() => (cars.length > 1 ? computeRadarScores(cars) : null), [cars]);
  const winners = radarScores ? bestCarIndices(radarScores) : [];

  const mixedCategories = useMemo(() => {
    const cats = cars.map((c) => c.category).filter(Boolean) as string[];
    const unique = [...new Set(cats)];
    return unique.length > 1 ? unique.map((c) => categoryLabels[c] ?? c) : null;
  }, [cars]);

  const mixedPowertrains = useMemo(() => {
    const pts = cars.map((c) => powertrainOf(c.fuelType));
    const unique = [...new Set(pts)];
    return unique.length > 1 ? unique.map((p) => powertrainLabels[p] ?? p) : null;
  }, [cars]);

  const carWins: string[][] = useMemo(() => {
    if (!radarScores) return cars.map(() => []);
    return cars.map((_, ci) => {
      const dimWins: string[] = [];
      radarScores.dimensions.forEach((dim, di) => {
        const col = radarScores.scores.map((row) => row[di]);
        const max = Math.max(...col);
        const maxIdx = col.filter((v) => v === max);
        if (maxIdx.length === 1 && col[ci] === max) {
          dimWins.push(dim.label);
        }
      });
      return dimWins;
    });
  }, [radarScores, cars]);

  const carLabel = (car: CompareCar): string =>
    `${car.brandName} ${car.modelName}${car.versionName ? ` · ${car.versionName}` : ""}`;

  const carVersionLine = (car: CompareCar): string =>
    `${car.year}${car.versionName ? ` · ${car.versionName}` : ""} · ${
      car.isZeroKm ? t("zeroKm") : t("used")
    }${car.category ? `, ${categoryLabels[car.category] ?? car.category}` : ""}${
      car.sizeCategory ? `, ${sizeCategoryLabels[car.sizeCategory] ?? car.sizeCategory}` : ""
    }`;

  /* ---------------- Render ---------------- */

  if (cars.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="mb-8 text-slate-500">{t("subtitle")}</p>
        <AddVehicleModal
          onSelect={addCar}
          selectedIds={[]}
          renderTrigger={(onOpen) => (
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              {t("addVehicle")}
            </button>
          )}
        />
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {cars.length} {t("of")} {MAX_CARS} {t("vehicles")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={share}
            className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Link2 className="h-4 w-4" />
            {shareCopied ? t("copied") : t("share")}
          </button>
        </div>
      </div>

      {mixedCategories && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {t("mixedCategoriesWarning", { categories: mixedCategories.join(", ") })}
          </p>
        </div>
      )}

      {mixedPowertrains && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {t("mixedPowertrainsWarning", { powertrains: mixedPowertrains.join(", ") })}
          </p>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {/* Selected cars + add slot */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cars.map((car, ci) => (
          <div
            key={car.modelYearId}
            className="relative rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => removeCar(car.modelYearId)}
              className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
              aria-label={`${t("remove")} ${car.modelName}`}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <BrandLogo logoUrl={car.brandLogoUrl} name={car.brandName} size={24} />
              <p className="text-xs text-slate-500">{car.brandName}</p>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {car.modelName}
              {car.versionName ? (
                <span className="text-slate-500"> · {car.versionName}</span>
              ) : null}
            </h3>
            <p className="mt-1 text-xs text-slate-500">{carVersionLine(car)}</p>
            <p className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
              {formatBRL(car.priceFipe)}
            </p>
            <span
              className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                carWins[ci].length > 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  : "invisible"
              }`}
              title={t("wonIn", { categories: carWins[ci].join(", ") })}
            >
              🏆 {t("victory", { count: carWins[ci].length })}
            </span>
            <Link
              href={`/financing?price=${car.priceFipe ?? ""}&model=${car.modelName}`}
              className="mt-3 flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <Calculator className="h-3.5 w-3.5" />
              {t("simulateFinancing")}
            </Link>
            {car.editorialRating && (
              <div>
                <Link
                  href={`/car/${car.slug}/review`}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  <Star className="h-3.5 w-3.5" />★ {car.editorialRating} · {t("readReview")}
                </Link>
                {car.editorialUpdatedAt && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {t("reviewOn", { date: formatDate(car.editorialUpdatedAt, locale) })}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {cars.length < MAX_CARS && (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <AddVehicleModal
              onSelect={addCar}
              selectedIds={cars.map((c) => c.modelYearId)}
              renderTrigger={(onOpen) => (
                <button
                  type="button"
                  onClick={onOpen}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Plus className="h-4 w-4" />
                  {t("addVehicle")}
                </button>
              )}
            />
          </div>
        )}
      </div>

      {/* Radar overview */}
      {radarScores && cars.length > 1 && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t("overviewTitle")}
            </h2>
            {winners.length === 1 && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                🏆 {t("winnerBadge", { cars: carLabel(cars[winners[0]]) })}
              </span>
            )}
            {winners.length > 1 && winners.length < cars.length && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                🏆{" "}
                {t("tieBadge", {
                  cars: winners.map((i) => carLabel(cars[i])).join(" e "),
                })}
              </span>
            )}
            {winners.length === cars.length && winners.length > 1 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                🏆 {t("tieAllBadge")}
              </span>
            )}
          </div>
          <RadarChart scores={radarScores} carNames={cars.map(carLabel)} />

          {/* Who leads each category — helps users pick by the dimensions they care about */}
          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("leadsTitle")}
            </p>
            {carWins.some((wins) => wins.length > 0) ? (
              <ul className="space-y-1.5">
                {cars.map((car, ci) =>
                  carWins[ci].length > 0 ? (
                    <li
                      key={car.modelYearId}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <span
                        className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: RADAR_COLORS[ci % RADAR_COLORS.length] }}
                      />
                      <span>
                        <strong className="font-semibold text-slate-900 dark:text-white">
                          {carLabel(car)}
                        </strong>{" "}
                        {t("leadsLine", { categories: carWins[ci].join(", ") })}
                      </span>
                    </li>
                  ) : null,
                )}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("leadsNone")}</p>
            )}
          </div>

          <p className="mt-4 text-xs text-slate-400">{t("overviewHint")}</p>
        </div>
      )}

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="w-48 px-4 py-3 text-left font-medium text-slate-500">
                {t("specification")}
              </th>
              {cars.map((car) => (
                <th key={car.modelYearId} className="px-4 py-3 text-left">
                  <Link
                    href={`/car/${car.slug}`}
                    className="font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                  >
                    {car.brandName} {car.modelName}
                  </Link>
                  {car.versionName && (
                    <p className="text-xs font-normal text-slate-600 dark:text-slate-300">
                      {car.versionName}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs font-normal text-slate-500">
                    {formatBRL(car.priceFipe)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t("addedOn", { date: formatDate(car.createdAt, locale) })}
                    {car.isZeroKm && car.priceFipe
                      ? ` · ${t("fipeOf", { month: formatMonthYear(car.priceUpdatedAt ?? car.createdAt, locale) })}`
                      : ""}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.groups.map((group) => (
              <GroupRows key={group.group} group={group} cars={cars} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Sales section */}
      {cars.some((c) => c.sales) && (
        <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3 text-left font-medium text-slate-500">{t("sales")}</th>
                {cars.map((car) => (
                  <th
                    key={car.modelYearId}
                    className="px-4 py-3 text-left font-medium text-slate-900 dark:text-white"
                  >
                    {car.sales ? (
                      <>
                        {t("rankingPosition", {
                          rank: car.sales.rankingPosition ?? tCommon("unavailable"),
                        })}
                        <span className="block text-xs font-normal text-slate-500">
                          {car.sales.unitsSold?.toLocaleString("pt-BR") ?? tCommon("unavailable")}{" "}
                          {t("units")}
                        </span>
                      </>
                    ) : (
                      <span className="font-normal text-slate-400">{t("noData")}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
      )}
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  const show = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: r.right + 8, y: r.top + r.height / 2 });
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onFocus={show}
        onBlur={() => setPos(null)}
        aria-label={text}
        className="ml-1 inline-flex cursor-help align-middle text-slate-400"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {pos && (
        <span
          role="tooltip"
          style={{ left: pos.x, top: pos.y, transform: "translateY(-50%)" }}
          className="pointer-events-none fixed z-50 w-64 rounded-md bg-slate-900 px-3 py-2 text-left text-xs font-normal leading-snug text-slate-100 shadow-lg dark:bg-slate-700"
        >
          {text}
        </span>
      )}
    </>
  );
}

function GroupRows({ group, cars }: { group: { group: string; rows: Row[] }; cars: CompareCar[] }) {
  const label = specGroupLabels[group.group] ?? group.group;
  const locale = useLocale();
  const t = useTranslations("compare");
  const tCommon = useTranslations("common");

  return (
    <>
      <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        <td
          colSpan={cars.length + 1}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500"
        >
          {label}
        </td>
      </tr>
      {group.rows.map((row) => (
        <tr key={row.name} className="border-b border-slate-100 dark:border-slate-800">
          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
            {row.name}
            {row.isConsumption && <InfoTooltip text={t("consumptionConversion")} />}
          </td>
          {row.values.map((v, i) => {
            const isSharedBest = row.bestIndexes.length > 1 && row.bestIndexes.includes(i);
            const isSoleBest = row.bestIndexes.length === 1 && row.bestIndexes.includes(i);
            return (
              <td
                key={cars[i]?.modelYearId ?? `col-${i}`}
                className={`px-4 py-2.5 font-medium ${
                  isSharedBest
                    ? "font-bold text-amber-600 dark:text-amber-400"
                    : isSoleBest
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-900 dark:text-white"
                }`}
              >
                {formatSpecValue(
                  {
                    value: v.value,
                    numericValue: v.numericValue,
                    unit: row.unit,
                    isNumeric: row.isNumeric,
                  },
                  { locale, unavailableText: tCommon("unavailable") },
                )}
                {row.isConsumption && v.originalValue != null && (
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    ({v.originalValue}
                    {v.originalUnit ? ` ${v.originalUnit}` : ""})
                  </span>
                )}
                {isSharedBest && (
                  <span className="ml-1 text-xs font-bold text-amber-500 dark:text-amber-400">
                    =
                  </span>
                )}
                {isSoleBest && <Trophy className="ml-1 inline h-3.5 w-3.5 text-amber-500" />}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

interface Row {
  name: string;
  unit: string | null;
  higherIsBetter: boolean;
  isNumeric: boolean;
  isConsumption: boolean;
  values: RowValue[];
  bestIndexes: number[];
  isTie: boolean;
}

/* ---------------- Version-aware cascade selector (modal) ---------------- */

function AddVehicleModal({
  onSelect,
  selectedIds,
  renderTrigger,
}: {
  onSelect: (modelYearId: number) => void;
  selectedIds: number[];
  renderTrigger: (onOpen: () => void) => React.ReactNode;
}) {
  const t = useTranslations("compare");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<CompareOptionBrand[] | null>(null);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [modelId, setModelId] = useState<number | null>(null);
  const [versionId, setVersionId] = useState<number | null>(null);
  const [year, setYear] = useState<CompareOptionYear | null>(null);

  const load = () => {
    setOpen(true);
    setLoading(true);
    setBrandId(null);
    setModelId(null);
    setVersionId(null);
    setYear(null);
    fetch(`/api/catalog/compare-options`)
      .then((r) => r.json())
      .then((data) => {
        setOptions(data.brands ?? []);
        setLoading(false);
      })
      .catch(() => {
        setOptions([]);
        setLoading(false);
      });
  };

  const close = () => {
    setOpen(false);
    setBrandId(null);
    setModelId(null);
    setVersionId(null);
    setYear(null);
  };

  const filteredOptions = useMemo(
    () => excludeSelectedYears(options ?? [], selectedIds),
    [options, selectedIds],
  );

  const brand = filteredOptions.find((b) => b.id === brandId) ?? null;
  const model = brand?.models.find((m) => m.id === modelId) ?? null;
  const version = model?.versions.find((v) => v.id === versionId) ?? null;
  const years = version?.years ?? [];

  const anyOptions = filteredOptions.length > 0;
  const ready = year != null;

  if (!open) return <>{renderTrigger(load)}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        onClick={close}
        aria-label={t("close")}
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("addVehicle")}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl outline-none sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t("addVehicle")}</h2>
          <button
            type="button"
            onClick={close}
            aria-label={tCommon("close")}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">{tCommon("loading")}</p>
        ) : !anyOptions ? (
          <p className="py-10 text-center text-sm text-slate-400">{t("noComparable")}</p>
        ) : (
          <div className="space-y-4">
            <CascadeSelect
              label={t("cascadeBrand")}
              value={brandId ?? ""}
              onChange={(v) => {
                setBrandId(v ? Number(v) : null);
                setModelId(null);
                setVersionId(null);
                setYear(null);
              }}
              options={filteredOptions.map((b) => ({
                value: b.id,
                label: b.name,
                models: b.models,
              }))}
            />
            {brand && (
              <CascadeSelect
                label={t("cascadeModel")}
                value={modelId ?? ""}
                onChange={(v) => {
                  setModelId(v ? Number(v) : null);
                  setVersionId(null);
                  setYear(null);
                }}
                options={brand.models.map((m) => ({
                  value: m.id,
                  label: m.name,
                  versions: m.versions,
                }))}
              />
            )}
            {model && (
              <CascadeSelect
                label={t("cascadeVersion")}
                value={versionId ?? ""}
                onChange={(v) => {
                  setVersionId(v ? Number(v) : null);
                  setYear(null);
                }}
                options={model.versions.map((v) => ({
                  value: v.id,
                  label: v.name,
                  years: v.years,
                }))}
              />
            )}
            {version && (
              <CascadeSelect
                label={t("cascadeYear")}
                value={year?.id ?? ""}
                onChange={(v) => {
                  const y = years.find((x) => x.id === Number(v));
                  setYear(y ?? null);
                }}
                options={years.map((y) => ({
                  value: y.id,
                  label: `${y.year} · ${fuelLabels[y.fuelType] ?? y.fuelType}${y.isZeroKm ? ` · ${t("zeroKm")}` : ""}`,
                }))}
              />
            )}

            <button
              type="button"
              disabled={!ready}
              onClick={() => {
                if (year) onSelect(year.id);
                close();
              }}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("addVehicle")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CascadeSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number | string;
  onChange: (value: string) => void;
  options: { value: number; label: string }[];
}) {
  return (
    <label className="block text-xs text-slate-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
      >
        <option value="" disabled>
          {label}...
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
