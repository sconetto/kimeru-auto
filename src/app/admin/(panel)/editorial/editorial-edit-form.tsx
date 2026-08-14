"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import type { Editorial } from "@/lib/db/schema";
import { saveEditorial } from "./actions";

interface Props {
  modelYearId: number;
  editorial: Editorial | null;
}

const SCORE_KEYS = ["design", "comfort", "performance", "technology", "value"] as const;
const SCORE_LABELS: Record<(typeof SCORE_KEYS)[number], string> = {
  design: "Design",
  comfort: "Conforto",
  performance: "Desempenho",
  technology: "Tecnologia",
  value: "Custo-benefício",
};

const initial = {
  pros: [] as string[],
  cons: [] as string[],
  summary: "",
  rating: "4.0",
  scoreBreakdown: { design: 4, comfort: 4, performance: 4, technology: 4, value: 4 },
  transcripts: [] as { videoUrl: string; title?: string; text: string }[],
  sourceVideos: [] as { url: string; title?: string }[],
};

export function EditorialEditForm({ modelYearId, editorial }: Props) {
  const [publish, setPublish] = useState(editorial?.published ?? false);
  const [pros, setPros] = useState(editorial?.pros.join("\n") ?? "");
  const [cons, setCons] = useState(editorial?.cons.join("\n") ?? "");
  const [summary, setSummary] = useState(editorial?.summary ?? "");
  const [rating, setRating] = useState(editorial?.rating ?? "4.0");
  const [breakdown, setBreakdown] = useState(editorial?.scoreBreakdown ?? initial.scoreBreakdown);

  function handleSubmit(formData: FormData) {
    const payload = {
      pros: pros.split("\n").map((s) => s.trim()).filter(Boolean),
      cons: cons.split("\n").map((s) => s.trim()).filter(Boolean),
      summary,
      rating,
      scoreBreakdown: breakdown,
      publish,
    };
    for (const [k, v] of Object.entries(payload)) {
      formData.set(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  }

  return (
    <form
      action={async (formData) => {
        handleSubmit(formData);
        await saveEditorial(formData);
      }}
      className="space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-6"
    >
      <input type="hidden" name="modelYearId" value={modelYearId} />
      <input type="hidden" name="locale" value="pt-BR" />

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="pros" className="mb-1.5 block text-sm font-medium text-slate-300">
            Pontos positivos <span className="text-xs text-slate-500">(um por linha)</span>
          </label>
          <textarea
            id="pros"
            rows={4}
            value={pros}
            onChange={(e) => setPros(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="cons" className="mb-1.5 block text-sm font-medium text-slate-300">
            Pontos negativos <span className="text-xs text-slate-500">(um por linha)</span>
          </label>
          <textarea
            id="cons"
            rows={4}
            value={cons}
            onChange={(e) => setCons(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="summary" className="mb-1.5 block text-sm font-medium text-slate-300">
          Resumo <span className="text-xs text-slate-500">(Markdown — ## seções renderizadas)</span>
        </label>
        <textarea
          id="summary"
          rows={10}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rating" className="mb-1.5 block text-sm font-medium text-slate-300">
            Nota geral <span className="text-xs text-slate-500">(1.0–5.0)</span>
          </label>
          <input
            id="rating"
            type="number"
            min={1}
            max={5}
            step={0.1}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-md border border-slate-800 p-4">
        <h3 className="mb-3 text-sm font-medium text-white">Notas por categoria</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {SCORE_KEYS.map((key) => (
            <div key={key}>
              <label htmlFor={`score-${key}`} className="mb-1 block text-xs text-slate-400">
                {SCORE_LABELS[key]}
              </label>
              <input
                id={`score-${key}`}
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={breakdown[key]}
                onChange={(e) =>
                  setBreakdown({ ...breakdown, [key]: Number(e.target.value) })
                }
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          name="publish"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
          className="h-4 w-4"
        />
        Publicar (fica visível no site)
      </label>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
      >
        <Save className="h-4 w-4" />
        Salvar conteúdo
      </button>
    </form>
  );
}
