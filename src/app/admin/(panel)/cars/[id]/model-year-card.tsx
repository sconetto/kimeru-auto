"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ModelYear, SpecCategory, SpecValue } from "@/lib/db/schema";
import { fuelType } from "@/lib/db/schema";
import { fuelLabels } from "@/lib/format-labels";
import { deleteModelYear, updateModelYear } from "../actions";
import { SpecValuesEditor } from "./specs/spec-values-editor";

const inputClass =
  "rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none";

export function ModelYearCard({
  year,
  categories,
  existing,
}: {
  year: ModelYear;
  categories: SpecCategory[];
  existing: SpecValue[];
}) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Versão {year.year} · {fuelLabels[year.fuelType] ?? year.fuelType}
        </h3>
        <form
          action={deleteModelYear}
          onSubmit={(e) => {
            if (!confirm(`Excluir a versão ${year.year}?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={year.id} />
          <button
            type="submit"
            title="Excluir versão"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </button>
        </form>
      </div>

      <form action={updateModelYear} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input type="hidden" name="id" value={year.id} />
        <label className="text-xs text-slate-500">
          Ano
          <input
            name="year"
            type="number"
            min={1980}
            max={2100}
            required
            defaultValue={year.year}
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
        <label className="text-xs text-slate-500">
          Combustível
          <select
            name="fuelType"
            defaultValue={year.fuelType}
            className={`mt-1 w-full ${inputClass}`}
          >
            {fuelType.enumValues.map((f) => (
              <option key={f} value={f}>
                {fuelLabels[f] ?? f}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Código FIPE
          <input
            name="fipeCode"
            defaultValue={year.fipeCode ?? ""}
            placeholder="001004-0"
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
        <label className="text-xs text-slate-500">
          Preço FIPE (R$)
          <input
            name="priceFipe"
            defaultValue={year.priceFipe ?? ""}
            placeholder="85000,00"
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-300">
          <input
            name="isZeroKm"
            type="checkbox"
            defaultChecked={year.isZeroKm}
            className="accent-blue-600"
          />
          0km
        </label>
        <div className="flex items-end">
          <YearSubmitButton />
        </div>
      </form>

      <div className="border-t border-slate-800 pt-4">
        <SpecValuesEditor modelYearId={year.id} categories={categories} existing={existing} />
      </div>
    </div>
  );
}

function YearSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
    >
      {pending ? "..." : "Salvar versão"}
    </button>
  );
}
