"use client";

import { useFormStatus } from "react-dom";
import { fuelType } from "@/lib/db/schema";
import { fuelLabels } from "@/lib/format-labels";
import { createModelYear } from "../actions";

const inputClass =
  "rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none";

export function NewModelYearForm({ modelId }: { modelId: number }) {
  return (
    <form
      action={createModelYear}
      className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-5"
    >
      <h3 className="text-sm font-semibold text-white">Nova versão</h3>
      <input type="hidden" name="modelId" value={modelId} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs text-slate-500">
          Nome da versão
          <input
            name="name"
            required
            placeholder="ex: Comfort 43 kWh"
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
        <label className="text-xs text-slate-500">
          Ano
          <input
            name="year"
            type="number"
            min={1980}
            max={2100}
            required
            placeholder="2025"
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
        <label className="text-xs text-slate-500">
          Combustível
          <select name="fuelType" defaultValue="flex" className={`mt-1 w-full ${inputClass}`}>
            {fuelType.enumValues.map((f) => (
              <option key={f} value={f}>
                {fuelLabels[f] ?? f}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Código FIPE
          <input name="fipeCode" placeholder="001004-0" className={`mt-1 w-full ${inputClass}`} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-300">
          <input name="isZeroKm" type="checkbox" className="accent-blue-600" />
          0km
        </label>
        <div className="flex items-end">
          <NewYearSubmitButton />
        </div>
      </div>
    </form>
  );
}

function NewYearSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
    >
      {pending ? "..." : "Adicionar versão"}
    </button>
  );
}
