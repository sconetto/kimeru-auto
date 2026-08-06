"use client";

import { AlertTriangle, Calculator, Link2, Plus, Trophy, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { RadarChart } from "@/components/compare/radar-chart";
import type { CompareCar, ModelCard } from "@/lib/catalog/queries";
import { bestCarIndices, computeRadarScores } from "@/lib/compare/scoring";
import { categoryLabels, formatBRL, sizeCategoryLabels, specGroupLabels } from "@/lib/format";
import { Link, useRouter } from "@/lib/i18n/navigation";

// Matches the RadarChart color palette so legend dots align with the graph.
const RADAR_COLORS = ["#2563eb", "#059669", "#d97706"];

interface Props {
  initialCars: CompareCar[];
}

const MAX_CARS = 3;

export function CompareClient({ initialCars }: Props) {
  const t = useTranslations("compare");
  const router = useRouter();
  const [cars, setCars] = useState<CompareCar[]>(initialCars);
  const [error, setError] = useState<string | null>(null);

  const carsSlugs = cars.map((c) => c.slug).join(",");
  const initialSlugs = initialCars.map((c) => c.slug).join(",");
  useEffect(() => {
    if (initialSlugs !== carsSlugs) {
      setCars(initialCars);
    }
  }, [initialSlugs, carsSlugs, initialCars]);

  /* ---------------- Car selection ---------------- */

  const addCar = (slug: string) => {
    if (cars.length >= MAX_CARS) {
      setError(t("maxCars"));
      return;
    }
    if (cars.some((c) => c.slug === slug)) {
      setError(t("alreadyAdded"));
      return;
    }
    const next = [...cars.map((c) => c.slug), slug];
    router.push(`/compare?cars=${next.join(",")}`);
    setError(null);
  };

  const removeCar = (slug: string) => {
    const next = cars.filter((c) => c.slug !== slug);
    router.push(
      next.length > 0 ? `/compare?cars=${next.map((c) => c.slug).join(",")}` : `/compare`,
    );
    setError(null);
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?cars=${cars.map((c) => c.slug).join(",")}`;
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
      values: (string | null)[];
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
            categories.set(spec.slug, {
              name: spec.name,
              unit: spec.unit,
              higherIsBetter: spec.higherIsBetter,
              isNumeric: spec.isNumeric,
              group: group.group,
            });
          }
        }
      }
    }

    const groups = new Map<string, Row[]>();
    for (const [slug, meta] of categories) {
      const values = cars.map((car) => {
        const group = car.specs.find((g) => g.group === meta.group);
        const spec = group?.specs.find((s) => s.slug === slug);
        return spec?.displayValue ?? spec?.value ?? null;
      });

      let bestIndexes: number[] = [];
      let isTie = false;
      if (meta.isNumeric) {
        const nums = cars.map((car) => {
          const g = car.specs.find((grp) => grp.group === meta.group);
          const spec = g?.specs.find((s) => s.slug === slug);
          if (spec?.numericValue != null) {
            const n = Number(spec.numericValue);
            if (!Number.isNaN(n)) return n;
          }
          const v = spec?.displayValue ?? spec?.value;
          return v != null ? Number(String(v).replace(/[^\d.-]/g, "")) : NaN;
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

  /* ---------------- Render ---------------- */

  if (cars.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="mb-8 text-slate-500">{t("subtitle")}</p>
        <CarSelector onSelect={addCar} />
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-10 rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-400 dark:border-slate-700">
          <Plus className="mx-auto mb-3 h-8 w-8" />
          <p>{t("addFirst")}</p>
        </div>
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

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {/* Selected cars + add slot */}
      <div
        className="mb-8 grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${Math.min(cars.length + (cars.length < MAX_CARS ? 1 : 0), MAX_CARS)}, minmax(0, 1fr))`,
        }}
      >
        {cars.map((car, ci) => (
          <div
            key={car.slug}
            className="relative rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => removeCar(car.slug)}
              className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
              aria-label={`${t("remove")} ${car.modelName}`}
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-xs text-slate-500">{car.brandName}</p>
            <h3 className="font-semibold text-slate-900 dark:text-white">{car.modelName}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {car.year} · {car.isZeroKm ? t("zeroKm") : t("used")}
              {car.category ? ` · ${categoryLabels[car.category] ?? car.category}` : ""}
              {car.sizeCategory
                ? ` · ${sizeCategoryLabels[car.sizeCategory] ?? car.sizeCategory}`
                : ""}
            </p>
            <p className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
              {formatBRL(car.priceFipe)}
            </p>
            {carWins[ci].length > 0 && (
              <span
                className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                title={t("wonIn", { categories: carWins[ci].join(", ") })}
              >
                🏆 {t("victory", { count: carWins[ci].length })}
              </span>
            )}
            <Link
              href={`/financing?price=${car.priceFipe ?? ""}&model=${car.modelName}`}
              className="mt-3 flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <Calculator className="h-3.5 w-3.5" />
              {t("simulateFinancing")}
            </Link>
          </div>
        ))}

        {cars.length < MAX_CARS && (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <CarSelector onSelect={addCar} compact />
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
                🏆{" "}
                {t("winnerBadge", {
                  cars: `${cars[winners[0]].brandName} ${cars[winners[0]].modelName}`,
                })}
              </span>
            )}
            {winners.length > 1 && winners.length < cars.length && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                🏆{" "}
                {t("tieBadge", {
                  cars: winners.map((i) => `${cars[i].brandName} ${cars[i].modelName}`).join(" e "),
                })}
              </span>
            )}
            {winners.length === cars.length && winners.length > 1 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                🏆 {t("tieAllBadge")}
              </span>
            )}
          </div>
          <RadarChart scores={radarScores} carNames={cars.map((c) => c.modelName)} />

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
                      key={car.slug}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <span
                        className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: RADAR_COLORS[ci % RADAR_COLORS.length] }}
                      />
                      <span>
                        <strong className="font-semibold text-slate-900 dark:text-white">
                          {car.brandName} {car.modelName}
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
                <th key={car.slug} className="px-4 py-3 text-left">
                  <Link
                    href={`/car/${car.slug}`}
                    className="font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                  >
                    {car.brandName} {car.modelName}
                  </Link>
                  <p className="mt-0.5 text-xs font-normal text-slate-500">
                    {formatBRL(car.priceFipe)}
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
                    key={car.slug}
                    className="px-4 py-3 text-left font-medium text-slate-900 dark:text-white"
                  >
                    {car.sales ? (
                      <>
                        {t("rankingPosition", { rank: car.sales.rankingPosition ?? "—" })}
                        <span className="block text-xs font-normal text-slate-500">
                          {car.sales.unitsSold?.toLocaleString("pt-BR") ?? "—"} {t("units")}
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

function GroupRows({ group, cars }: { group: { group: string; rows: Row[] }; cars: CompareCar[] }) {
  const label = specGroupLabels[group.group] ?? group.group;

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
            {row.unit ? <span className="ml-1 text-xs text-slate-400">({row.unit})</span> : null}
          </td>
          {row.values.map((v, i) => {
            const isSharedBest = row.bestIndexes.length > 1 && row.bestIndexes.includes(i);
            const isSoleBest = row.bestIndexes.length === 1 && row.bestIndexes.includes(i);
            return (
              <td
                key={cars[i]?.slug ?? `col-${i}`}
                className={`px-4 py-2.5 font-medium ${
                  isSharedBest
                    ? "font-bold text-amber-600 dark:text-amber-400"
                    : isSoleBest
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-900 dark:text-white"
                }`}
              >
                {v ?? "—"}
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
  values: (string | null)[];
  bestIndexes: number[];
  isTie: boolean;
}

/* ---------------- Car selector ---------------- */

function CarSelector({
  onSelect,
  compact,
}: {
  onSelect: (slug: string) => void;
  compact?: boolean;
}) {
  const t = useTranslations("compare");
  const tCommon = useTranslations("common");
  const [options, setOptions] = useState<ModelCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/catalog/models`)
      .then((r) => r.json())
      .then((data) => {
        setOptions(data.models ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="w-full">
      <label htmlFor="car-select" className="sr-only">
        {t("selectVehicle")}
      </label>
      <select
        id="car-select"
        value=""
        onChange={(e) => e.target.value && onSelect(e.target.value)}
        className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
          compact ? "border-dashed" : ""
        }`}
      >
        <option value="" disabled>
          {loading ? tCommon("loading") : compact ? `+ ${t("addVehicle")}` : t("selectVehicle")}
        </option>
        {options.map((m) => (
          <option key={m.id} value={m.slug}>
            {m.brandName} {m.name} — {m.year ?? ""}
          </option>
        ))}
      </select>
    </div>
  );
}
