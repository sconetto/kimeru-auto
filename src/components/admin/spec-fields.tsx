"use client";

import type { SpecCategory } from "@/lib/db/schema";
import { specGroupLabels } from "@/lib/format-labels";

export function SpecFields({
  categories,
  values,
  onChange,
  fuelType: fuel,
}: {
  categories: SpecCategory[];
  values: Record<number, string>;
  onChange: (categoryId: number, value: string) => void;
  fuelType?: string;
}) {
  const applicable = fuel
    ? categories.filter(
        (cat) =>
          cat.applicableFuelTypes == null || (cat.applicableFuelTypes as string[]).includes(fuel),
      )
    : categories;

  const grouped = applicable.reduce<Record<string, SpecCategory[]>>((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([group, cats]) => (
        <section key={group} className="rounded-lg border border-slate-800 bg-slate-900">
          <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-white">
            {specGroupLabels[group] ?? group}
          </h2>
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((cat) => (
              <div key={cat.id}>
                <label className="block text-xs text-slate-400">
                  {cat.name}
                  {cat.unit ? <span className="ml-1">({cat.unit})</span> : null}
                  <input
                    value={values[cat.id] ?? ""}
                    onChange={(e) => onChange(cat.id, e.target.value)}
                    placeholder={cat.isNumeric ? "Ex: 120" : "Ex: McPherson"}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </label>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
