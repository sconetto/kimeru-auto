"use client";

import { Save } from "lucide-react";
import { useState, useTransition } from "react";
import { SpecFields } from "@/components/admin/spec-fields";
import type { SpecCategory, SpecValue } from "@/lib/db/schema";

interface Props {
  modelYearId: number;
  categories: SpecCategory[];
  existing: SpecValue[];
}

export function SpecValuesEditor({ modelYearId, categories, existing }: Props) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const v of existing) init[v.specCategoryId] = v.value ?? "";
    return init;
  });

  function save() {
    const existingByCat = new Map(existing.map((v) => [v.specCategoryId, v]));
    const toSave: { categoryId: number; value: string; numericValue: string | null }[] = [];
    const deleteCategoryIds: number[] = [];
    for (const cat of categories) {
      const raw = values[cat.id] ?? "";
      if (!raw.trim()) {
        if (existingByCat.has(cat.id)) deleteCategoryIds.push(cat.id);
        continue;
      }
      let numericValue: string | null = null;
      if (cat.isNumeric) {
        const parsed = Number(raw.replace(",", "."));
        if (!Number.isNaN(parsed)) numericValue = String(parsed);
      }
      toSave.push({ categoryId: cat.id, value: raw, numericValue });
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
        body: JSON.stringify({ values: toSave }),
      });
      if (res.ok) window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <SpecFields
        categories={categories}
        values={values}
        onChange={(categoryId, value) => setValues((prev) => ({ ...prev, [categoryId]: value }))}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
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
    </div>
  );
}
