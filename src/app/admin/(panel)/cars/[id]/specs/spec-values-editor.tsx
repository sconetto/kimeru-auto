"use client";

import { Save } from "lucide-react";
import { useTransition } from "react";
import type { SpecCategory, SpecValue } from "@/lib/db/schema";
import { specGroupLabels } from "@/lib/format";

interface Props {
  modelYearId: number;
  categories: SpecCategory[];
  existing: SpecValue[];
}

export function SpecValuesEditor({ modelYearId, categories, existing }: Props) {
  const [isPending, startTransition] = useTransition();
  const existingByCat = new Map(existing.map((v) => [v.specCategoryId, v]));

  const grouped = categories.reduce<Record<string, SpecCategory[]>>((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {});

  function save(formData: FormData) {
    const values: { categoryId: number; value: string; numericValue: string | null }[] = [];
    const deleteCategoryIds: number[] = [];
    for (const cat of categories) {
      const raw = String(formData.get(`spec-${cat.id}`) ?? "");
      const hasExisting = existingByCat.has(cat.id);
      if (!raw.trim()) {
        if (hasExisting) deleteCategoryIds.push(cat.id);
        continue;
      }
      let numericValue: string | null = null;
      if (cat.isNumeric) {
        const parsed = Number(raw.replace(",", "."));
        if (!Number.isNaN(parsed)) numericValue = String(parsed);
      }
      values.push({ categoryId: cat.id, value: raw, numericValue });
    }

    startTransition(async () => {
      for (const categoryId of deleteCategoryIds) {
        await fetch(`/api/admin/spec-values/${modelYearId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId }),
        });
      }
      const res = await fetch(`/api/admin/spec-values/${modelYearId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (res.ok) window.location.reload();
    });
  }

  return (
    <form action={save} className="space-y-6">
      {Object.entries(grouped).map(([group, cats]) => (
        <section key={group} className="rounded-lg border border-slate-800 bg-slate-900">
          <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-white">
            {specGroupLabels[group] ?? group}
          </h2>
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((cat) => {
              const existingValue = existingByCat.get(cat.id);
              return (
                <div key={cat.id}>
                  <label htmlFor={`spec-${cat.id}`} className="mb-1 block text-xs text-slate-400">
                    {cat.name}
                    {cat.unit ? <span className="ml-1">({cat.unit})</span> : null}
                  </label>
                  <input
                    id={`spec-${cat.id}`}
                    name={`spec-${cat.id}`}
                    defaultValue={existingValue?.value ?? ""}
                    placeholder={cat.isNumeric ? "Ex: 120" : "Ex: McPherson"}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          title="Salvar especificações"
          className="flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Salvando..." : "Salvar especificações"}
        </button>
        <span className="text-xs text-slate-500">
          Os valores aparecem na comparação imediatamente.
        </span>
      </div>
    </form>
  );
}
