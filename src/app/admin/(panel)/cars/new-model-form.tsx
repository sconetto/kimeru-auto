"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { Brand } from "@/lib/db/schema";
import { categoryLabels } from "@/lib/format";
import { createModel, createModelYear } from "./actions";

const CATEGORIES = Object.entries(categoryLabels);

export function NewModelForm({ brands }: { brands: Brand[] }) {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [modelId, setModelId] = useState<number | null>(null);
  const [showYearForm, setShowYearForm] = useState(false);

  return (
    <div className="space-y-4">
      <form action={createModel} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-medium text-white">Novo modelo</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <select
            name="brandId"
            required
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">Marca...</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input
            name="name"
            placeholder="Nome (ex: HB20)"
            required
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <select
            name="category"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">Categoria...</option>
            {CATEGORIES.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <SubmitButton label="Criar modelo" />
        </div>
      </form>

      {showYearForm && modelId && (
        <form
          action={createModelYear}
          className="rounded-lg border border-slate-800 bg-slate-900 p-5"
        >
          <h2 className="mb-3 text-sm font-medium text-white">Nova versão (model year)</h2>
          <input type="hidden" name="modelId" value={modelId} />
          <div className="grid gap-3 sm:grid-cols-4">
            <input
              name="year"
              type="number"
              min={1980}
              max={2100}
              placeholder="Ano (ex: 2025)"
              required
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <select
              name="fuelType"
              required
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="flex">Flex</option>
              <option value="gasoline">Gasolina</option>
              <option value="ethanol">Etanol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Híbrido</option>
              <option value="hybrid_plug_in">Híbrido Plug-in</option>
              <option value="electric">Elétrico</option>
            </select>
            <input
              name="fipeCode"
              placeholder="Código FIPE (opcional)"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input name="isZeroKm" type="checkbox" className="accent-blue-600" /> 0km
              </label>
              <SubmitButton label="Criar versão" />
            </div>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setShowYearForm(!showYearForm);
            setModelId(null);
          }}
          className="text-blue-400 hover:underline"
        >
          {showYearForm ? "Cancelar versão" : "+ Adicionar versão manualmente"}
        </button>
        {showYearForm && (
          <input
            type="number"
            placeholder="ID do modelo"
            onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : null)}
            className="w-32 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
    >
      {pending ? "..." : label}
    </button>
  );
}
