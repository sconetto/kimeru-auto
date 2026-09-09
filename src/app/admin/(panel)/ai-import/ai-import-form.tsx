"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { SpecFields } from "@/components/admin/spec-fields";
import type { SpecCategory } from "@/lib/db/schema";
import { createCarFromAi } from "./actions";

const YEAR_TOOLTIP =
  "Ano-modelo (não o ano de fabricação). No Brasil usa-se a notação fabricação/modelo (ex.: 2026/2027); o valor alinhado à FIPE é o ano-modelo.";

const FUEL_TYPES = [
  { value: "flex", label: "Flex" },
  { value: "gasoline", label: "Gasolina" },
  { value: "ethanol", label: "Etanol" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Híbrido" },
  { value: "hybrid_plug_in", label: "Híbrido Plug-in" },
  { value: "electric", label: "Elétrico" },
] as const;

function parseNumeric(value: string): number | null {
  const m = value
    .replace(/\./g, "")
    .replace(",", ".")
    .match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

interface BrandOption {
  id: number;
  name: string;
}
interface CategoryOption {
  slug: string;
  name: string;
}

interface EditableCar {
  brandId: number | "";
  brandName: string;
  model: string;
  year: number;
  fuelType: string;
  priceFipe: string;
  isZeroKm: boolean;
  category: string;
  sizeCategory: string;
  fipeCode: string;
  specs: Record<number, string>;
}

interface ParsedData {
  brand: string;
  model: string;
  year: number | null;
  fuelType: string;
  isZeroKm: boolean;
  priceFipe: number | null;
  category: string | null;
  sizeCategory: string | null;
  fipeCode: string | null;
  specs: { slug: string; value: string }[];
}

interface ParseResponse {
  status: string;
  data?: ParsedData;
  brandMatch?: { id: number; name: string; score: number } | null;
  error?: string;
}

const inputClass =
  "rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none";

export function AiImportForm({
  brands,
  categories,
  specCategories,
}: {
  brands: BrandOption[];
  categories: CategoryOption[];
  specCategories: SpecCategory[];
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [creating, setCreating] = useState(false);
  const [car, setCar] = useState<EditableCar | null>(null);

  function patchCar(patch: Partial<EditableCar>) {
    setCar((c) => (c ? { ...c, ...patch } : c));
  }

  function patchSpec(categoryId: number, value: string) {
    setCar((c) => (c ? { ...c, specs: { ...c.specs, [categoryId]: value } } : c));
  }

  async function parse() {
    setLoading(true);
    setError("");
    setResult("");
    setCar(null);
    try {
      const res = await fetch("/api/admin/ai/parse-car", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json()) as ParseResponse;
      if (!res.ok) {
        setError(json.error ?? "Falha ao analisar a fonte");
      } else if (json.data) {
        const slugToId = new Map(specCategories.map((c) => [c.slug, c.id]));
        const specs: Record<number, string> = {};
        for (const s of json.data.specs) {
          const id = slugToId.get(s.slug);
          if (id != null) specs[id] = s.value;
        }
        setCar({
          brandId: json.brandMatch?.id ?? "",
          brandName: json.data.brand,
          model: json.data.model,
          year: json.data.year ?? new Date().getFullYear(),
          fuelType: json.data.fuelType || "flex",
          priceFipe: json.data.priceFipe ? String(json.data.priceFipe) : "",
          isZeroKm: json.data.isZeroKm,
          category: json.data.category ?? "",
          sizeCategory: json.data.sizeCategory ?? "",
          fipeCode: json.data.fipeCode ?? "",
          specs,
        });
      }
    } catch {
      setError("Falha na requisição");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    if (!car) return;
    setCreating(true);
    setResult("");
    const idToSlug = new Map(specCategories.map((c) => [c.id, c.slug]));
    const specs = Object.entries(car.specs)
      .filter(([, value]) => value.trim())
      .map(([categoryId, value]) => ({
        slug: idToSlug.get(Number(categoryId)) ?? "",
        value,
        numericValue: parseNumeric(value),
      }))
      .filter((s) => s.slug);
    const r = await createCarFromAi({
      brandId: car.brandId === "" ? null : Number(car.brandId),
      brandName: car.brandName,
      model: car.model,
      year: car.year,
      fuelType: car.fuelType,
      priceFipe: car.priceFipe ? Number(car.priceFipe.replace(/\./g, "").replace(",", ".")) : null,
      isZeroKm: car.isZeroKm,
      category: car.category || null,
      sizeCategory: car.sizeCategory || null,
      fipeCode: car.fipeCode || null,
      specs,
    });
    setResult(r.ok ? `✓ Carro criado (modelo ID ${r.modelId})` : (r.error ?? "Falha ao criar"));
    setCreating(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://exemplo.com/ficha-tecnica.pdf"
          className={`flex-1 ${inputClass}`}
          aria-label="URL da fonte"
        />
        <button
          type="button"
          onClick={parse}
          disabled={loading || !url}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Analisando..." : "Analisar"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {result && <p className="text-sm text-emerald-400">{result}</p>}

      {car && (
        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-medium text-white">Revisar e editar dados</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-500">
              Marca
              <select
                value={car.brandId}
                onChange={(e) =>
                  patchCar({ brandId: e.target.value === "" ? "" : Number(e.target.value) })
                }
                className={`mt-1 w-full ${inputClass}`}
              >
                <option value="">Criar nova marca…</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            {car.brandId === "" && (
              <label className="text-xs text-slate-500">
                Nova marca
                <input
                  value={car.brandName}
                  onChange={(e) => patchCar({ brandName: e.target.value })}
                  className={`mt-1 w-full ${inputClass}`}
                />
              </label>
            )}
            <label className="text-xs text-slate-500">
              Modelo
              <input
                value={car.model}
                onChange={(e) => patchCar({ model: e.target.value })}
                className={`mt-1 w-full ${inputClass}`}
              />
            </label>
            <label className="text-xs text-slate-500">
              <span className="flex items-center gap-1">
                Ano
                <span title={YEAR_TOOLTIP} className="flex">
                  <Info size={14} className="text-slate-500" />
                </span>
              </span>
              <input
                type="number"
                value={car.year}
                onChange={(e) => patchCar({ year: Number(e.target.value) })}
                title={YEAR_TOOLTIP}
                className={`mt-1 w-full ${inputClass}`}
              />
            </label>
            <label className="text-xs text-slate-500">
              Combustível
              <select
                value={car.fuelType}
                onChange={(e) => patchCar({ fuelType: e.target.value })}
                className={`mt-1 w-full ${inputClass}`}
              >
                {FUEL_TYPES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Preço FIPE (R$)
              <input
                value={car.priceFipe}
                onChange={(e) => patchCar({ priceFipe: e.target.value })}
                placeholder="123456"
                className={`mt-1 w-full ${inputClass}`}
              />
            </label>
            <label className="text-xs text-slate-500">
              Categoria
              <select
                value={car.category}
                onChange={(e) => patchCar({ category: e.target.value })}
                className={`mt-1 w-full ${inputClass}`}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Porte
              <input
                value={car.sizeCategory}
                onChange={(e) => patchCar({ sizeCategory: e.target.value })}
                placeholder="compacto"
                className={`mt-1 w-full ${inputClass}`}
              />
            </label>
            <label className="text-xs text-slate-500">
              Código FIPE
              <input
                value={car.fipeCode}
                onChange={(e) => patchCar({ fipeCode: e.target.value })}
                placeholder="005340-2"
                className={`mt-1 w-full ${inputClass}`}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={car.isZeroKm}
              onChange={(e) => patchCar({ isZeroKm: e.target.checked })}
              className="accent-blue-600"
            />
            0km
          </label>

          <div>
            <h3 className="mb-2 text-xs font-medium text-slate-500">Especificações</h3>
            <SpecFields
              categories={specCategories}
              values={car.specs}
              onChange={patchSpec}
              fuelType={car.fuelType}
            />
          </div>

          <button
            type="button"
            onClick={create}
            disabled={creating || !car.model}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {creating ? "Criando..." : "Criar carro"}
          </button>
        </div>
      )}
    </div>
  );
}
