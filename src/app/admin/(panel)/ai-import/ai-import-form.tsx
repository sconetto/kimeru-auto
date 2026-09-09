"use client";

import { useState } from "react";
import { createCarFromAi } from "./actions";

interface ParsedSpec {
  slug: string;
  value: string;
  numericValue: number | null;
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
  specs: ParsedSpec[];
}

interface ParseResponse {
  status: string;
  data?: ParsedData;
  brandMatch?: { id: number; name: string; score: number } | null;
  error?: string;
}

export function AiImportForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ParseResponse | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState("");

  async function parse() {
    setLoading(true);
    setError("");
    setResp(null);
    setResult("");
    try {
      const res = await fetch("/api/admin/ai/parse-car", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json()) as ParseResponse;
      if (!res.ok) {
        setError(json.error ?? "Falha ao analisar a fonte");
        setResp(null);
      } else {
        setResp(json);
      }
    } catch {
      setError("Falha na requisição");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    if (!resp?.data) return;
    setCreating(true);
    setResult("");
    const r = await createCarFromAi({
      brandId: resp.brandMatch?.id ?? null,
      brandName: resp.data.brand,
      model: resp.data.model,
      year: resp.data.year ?? new Date().getFullYear(),
      fuelType: resp.data.fuelType,
      priceFipe: resp.data.priceFipe,
      isZeroKm: resp.data.isZeroKm,
      category: resp.data.category,
      sizeCategory: resp.data.sizeCategory,
      specs: resp.data.specs,
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
          className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
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

      {resp?.data && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Revisar dados extraídos</h2>
            {resp.brandMatch ? (
              <span className="text-xs text-slate-400">
                Marca: <span className="text-blue-400">{resp.brandMatch.name}</span>
              </span>
            ) : (
              <span className="text-xs text-amber-400">Marca será criada: {resp.data.brand}</span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Modelo</dt>
              <dd className="text-white">{resp.data.model}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Ano</dt>
              <dd className="text-white">{resp.data.year ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Combustível</dt>
              <dd className="text-white">{resp.data.fuelType || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Preço FIPE</dt>
              <dd className="text-white">
                {resp.data.priceFipe ? `R$ ${resp.data.priceFipe.toLocaleString("pt-BR")}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Categoria</dt>
              <dd className="text-white">{resp.data.category ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Porte</dt>
              <dd className="text-white">{resp.data.sizeCategory ?? "—"}</dd>
            </div>
          </dl>

          {resp.data.specs.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-medium text-slate-500">
                Especificações ({resp.data.specs.length})
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                {resp.data.specs.map((s) => (
                  <div key={s.slug} className="flex justify-between">
                    <span className="text-slate-400">{s.slug}</span>
                    <span className="text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={create}
            disabled={creating}
            className="mt-5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {creating ? "Criando..." : "Criar carro"}
          </button>
        </div>
      )}
    </div>
  );
}
