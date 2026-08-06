"use client";

import { useFormStatus } from "react-dom";
import { specGroupLabels } from "@/lib/format";
import { createSpecCategory } from "./actions";

const GROUPS = Object.entries(specGroupLabels);

export function NewSpecCategoryForm() {
  return (
    <form
      action={createSpecCategory}
      className="rounded-lg border border-slate-800 bg-slate-900 p-5"
    >
      <h2 className="mb-3 text-sm font-medium text-white">Nova categoria</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <input
          name="name"
          placeholder="Nome (ex: Potência)"
          required
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
        <input
          name="unit"
          placeholder="Unidade (ex: cv)"
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
        <select
          name="group"
          required
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          {GROUPS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-xs text-slate-300">
            <input name="isNumeric" type="checkbox" className="accent-blue-600" /> Numérico
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-300">
            <input
              name="higherIsBetter"
              type="checkbox"
              defaultChecked
              className="accent-blue-600"
            />{" "}
            Maior = melhor
          </label>
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
    >
      {pending ? "..." : "Criar"}
    </button>
  );
}
