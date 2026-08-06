"use client";

import { ChevronDown, ChevronRight, Trophy } from "lucide-react";
import { useState } from "react";
import type { SpecGrouped } from "@/lib/catalog/queries";
import { formatNumber, specGroupLabels } from "@/lib/format";

interface Props {
  specs: SpecGrouped[];
}

/**
 * Spec comparison table (also reused by the comparison tool).
 * Renders grouped spec sections; numeric rows highlight the best value.
 */
export function SpecTable({ specs }: Props) {
  return (
    <div className="space-y-6">
      {specs.map((group) => (
        <SpecSection key={group.group} group={group} />
      ))}
    </div>
  );
}

function SpecSection({ group }: { group: SpecGrouped }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-t-lg px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {specGroupLabels[group.group] ?? group.group}
        </h3>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {group.specs.map((spec) => (
            <div
              key={spec.categoryId}
              className="flex items-center justify-between px-4 py-2.5 text-sm"
            >
              <span className="text-slate-600 dark:text-slate-300">
                {spec.name}
                {spec.unit ? (
                  <span className="ml-1 text-xs text-slate-400">({spec.unit})</span>
                ) : null}
              </span>
              <span className="font-medium text-slate-900 dark:text-white">
                {spec.displayValue ?? spec.value ?? "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Single-row spec comparison for the comparison tool (multiple columns). */
export function SpecRow({
  name,
  unit,
  values,
  higherIsBetter,
  isNumeric,
}: {
  name: string;
  unit: string | null;
  values: (string | number | null)[];
  higherIsBetter: boolean;
  isNumeric: boolean;
}) {
  // Find the best numeric value
  const nums = values.map((v) =>
    typeof v === "number" ? v : v != null ? Number(String(v).replace(",", ".")) : NaN,
  );
  const valid = nums.filter((n) => !Number.isNaN(n));
  let bestIndex = -1;
  if (isNumeric && valid.length > 0) {
    const best = higherIsBetter ? Math.max(...valid) : Math.min(...valid);
    bestIndex = nums.indexOf(best);
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-slate-600 dark:text-slate-300">
        {name}
        {unit ? <span className="ml-1 text-xs text-slate-400">({unit})</span> : null}
      </span>
      <div className="flex items-center gap-4">
        {values.map((v, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: positional columns, no stable id
            key={i}
            className={`relative w-20 text-right font-medium ${
              i === bestIndex
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {v == null || v === "" ? "—" : formatNumber(String(v))}
            {i === bestIndex && (
              <Trophy className="absolute -left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-amber-500" />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
