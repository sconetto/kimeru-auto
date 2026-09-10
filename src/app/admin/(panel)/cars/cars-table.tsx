"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ModelRow } from "./model-row";

interface VersionSummary {
  id: number;
  name: string;
  slug: string;
}

export interface CarTableModel {
  id: number;
  name: string;
  slug: string;
  category: string | null;
  isActive: boolean;
  brandId: number;
  brandName: string;
  yearCount: number;
  categoryLabel: string;
  versions: VersionSummary[];
}

const inputClass =
  "rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none";

export function CarsTable({ models }: { models: CarTableModel[] }) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");

  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of models) counts.set(m.brandName, (counts.get(m.brandName) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [models]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((m) => {
      if (brand && m.brandName !== brand) return false;
      if (!q) return true;
      const haystack = [
        m.name,
        m.slug,
        m.brandName,
        m.categoryLabel,
        ...m.versions.flatMap((v) => [v.name, v.slug]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [models, query, brand]);

  const showEmpty = query.trim() !== "" || brand !== "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por modelo, marca, categoria ou versão..."
            className={`w-full pl-9 pr-9 ${inputClass}`}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              title="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          aria-label="Filtrar por marca"
          className={inputClass}
        >
          <option value="">Todas as marcas</option>
          {brands.map(([name, count]) => (
            <option key={name} value={name}>
              {name} ({count})
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length} de {models.length} modelos
        {showEmpty && ` · filtrando`}
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Versões</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <ModelRow key={row.id} model={row} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-slate-500">
            Nenhum modelo encontrado
            {showEmpty ? " para a busca atual." : "."}
          </p>
        )}
      </div>
    </div>
  );
}
