"use client";

import { Bot, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

interface CarOption {
  modelYearId: number;
  modelName: string;
  brandName: string;
  year: number;
}

interface Props {
  cars: CarOption[];
  stagedKeys: Set<string>;
}

interface GeneratedContent {
  pros: string[];
  cons: string[];
  summary: string;
  rating: number;
}

export function EditorialPanel({ cars, stagedKeys }: Props) {
  const [modelYearId, setModelYearId] = useState("");
  const [locale, setLocale] = useState<"pt-BR" | "en-US">("pt-BR");
  const [urls, setUrls] = useState("");
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = cars.find((c) => String(c.modelYearId) === modelYearId);
  const isStaged = selected ? stagedKeys.has(`${selected.modelYearId}:${locale}`) : false;

  function generate() {
    const videoUrls = urls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (!modelYearId || videoUrls.length === 0) {
      setError("Selecione um veículo e informe ao menos uma URL");
      return;
    }
    setStatus("loading");
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/admin/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelYearId: Number(modelYearId), locale, videoUrls }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Erro ao gerar conteúdo");
        return;
      }
      setContent(data.content);
      setStatus("idle");
    });
  }

  function publish() {
    startTransition(async () => {
      const res = await fetch("/api/admin/editorial/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editorialId: null,
          modelYearId: Number(modelYearId),
          locale,
          content,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error ?? "Erro ao publicar");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* Configuration */}
      <div className="h-fit space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-sm font-medium text-white">Configuração</h2>

        <div>
          <label htmlFor="ed-vehicle" className="mb-1 block text-xs text-slate-400">
            Veículo
          </label>
          <select
            id="ed-vehicle"
            value={modelYearId}
            onChange={(e) => setModelYearId(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">Selecionar veículo...</option>
            {cars.map((c) => (
              <option key={c.modelYearId} value={c.modelYearId}>
                {c.brandName} {c.modelName} {c.year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-1 block text-xs text-slate-400">Idioma</span>
          <div className="flex gap-2">
            {(["pt-BR", "en-US"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  locale === l
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ed-urls" className="mb-1 block text-xs text-slate-400">
            URLs de reviews no YouTube (uma por linha)
          </label>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={4}
            placeholder={"https://youtu.be/xxx\nhttps://www.youtube.com/watch?v=yyy"}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={isPending || status === "loading"}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {status === "loading" ? "Gerando..." : "Gerar conteúdo com IA"}
        </button>

        {isStaged && (
          <p className="flex items-center gap-1.5 text-xs text-amber-400">
            <Bot className="h-3.5 w-3.5" /> Conteúdo gerado aguardando revisão para este
            veículo/idioma.
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {/* Review editor */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
          <Bot className="h-4 w-4 text-blue-500" /> Revisão e publicação
        </h2>

        {!content && (
          <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center">
            <Bot className="mx-auto mb-3 h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-500">
              {status === "loading"
                ? "Analisando transcrições dos vídeos..."
                : "Gere o conteúdo para revisar. Nada é publicado sem sua aprovação."}
            </p>
          </div>
        )}

        {content && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-blue-600 px-2 py-1 text-sm font-bold text-white">
                Nota: {content.rating.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500">
                Rascunho gerado por IA — revise antes de publicar
              </span>
            </div>

            <div>
              <label htmlFor="ed-summary" className="mb-1 block text-xs text-slate-400">
                Resumo
              </label>
              <textarea
                id="ed-summary"
                value={content.summary}
                onChange={(e) => setContent({ ...content, summary: e.target.value })}
                rows={4}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1 block text-xs font-medium text-emerald-400">
                  Pontos fortes
                </span>
                {content.pros.map((p, i) => (
                  <input
                    // biome-ignore lint/suspicious/noArrayIndexKey: editable-in-place list, no stable id
                    key={i}
                    aria-label={`Ponto forte ${i + 1}`}
                    value={p}
                    onChange={(e) => {
                      const pros = [...content.pros];
                      pros[i] = e.target.value;
                      setContent({ ...content, pros });
                    }}
                    className="mb-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                ))}
              </div>
              <div>
                <span className="mb-1 block text-xs font-medium text-red-400">Pontos fracos</span>
                {content.cons.map((c, i) => (
                  <input
                    // biome-ignore lint/suspicious/noArrayIndexKey: editable-in-place list, no stable id
                    key={i}
                    aria-label={`Ponto fraco ${i + 1}`}
                    value={c}
                    onChange={(e) => {
                      const cons = [...content.cons];
                      cons[i] = e.target.value;
                      setContent({ ...content, cons });
                    }}
                    className="mb-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={publish}
                disabled={isPending}
                className="flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isPending ? "Publicando..." : "Publicar no site"}
              </button>
              <button
                type="button"
                onClick={() => setContent(null)}
                className="rounded-md border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Descartar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
