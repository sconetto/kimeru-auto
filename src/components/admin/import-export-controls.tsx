"use client";

import { Download, Upload } from "lucide-react";
import { useState } from "react";
import { ENTITY_LABELS, type ExportableEntity } from "@/lib/catalog/bulk-entities";

interface PreviewState {
  headers: string[];
  rowCount: number;
  previewRows: string[][];
}

interface ResultState {
  created: number;
  updated: number;
  errors: Array<{ rowNumber: number; message: string }>;
}

export function ImportExportControls({ entity }: { entity: ExportableEntity }) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(f: File) {
    setFile(f);
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", f);
      formData.append("mode", "preview");
      const res = await fetch(`/api/admin/import/${entity}`, { method: "POST", body: formData });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Falha ao analisar o arquivo");
        setPreview(null);
        return;
      }
      setPreview(body);
    } catch {
      setError("Falha ao analisar o arquivo");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "apply");
      const res = await fetch(`/api/admin/import/${entity}`, { method: "POST", body: formData });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Falha na importação");
        return;
      }
      setResult({ created: body.created, updated: body.updated, errors: body.errors ?? [] });
      setPreview(null);
      window.location.reload();
    } catch {
      setError("Falha na importação");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`/api/admin/export/${entity}`}
        className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
      >
        <Download className="h-3.5 w-3.5" />
        Exportar CSV
      </a>

      <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700">
        <Upload className="h-3.5 w-3.5" />
        {busy ? "Processando…" : "Importar CSV"}
        <input
          type="file"
          accept=".csv"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {preview && !result && (
        <div className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm">
          <p className="mb-2 text-slate-300">
            {preview.rowCount} linha(s) detectadas — colunas:{" "}
            <span className="font-mono text-xs text-slate-400">{preview.headers.join(", ")}</span>
          </p>
          <div className="mb-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500">
                  {preview.headers.map((h) => (
                    <th key={h} className="px-2 py-1">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.previewRows.map((row) => (
                  <tr key={row.join("|")} className="border-t border-slate-800 text-slate-300">
                    {row.map((cell) => (
                      <td key={cell} className="px-2 py-1">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void apply()}
              disabled={busy}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {busy ? "Importando…" : "Confirmar importação"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
              className="rounded-md px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm">
          <p className="text-slate-300">
            {result.created} criado(s) · {result.updated} atualizado(s)
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-red-400">
              {result.errors.slice(0, 8).map((e) => (
                <li key={e.rowNumber}>
                  Linha {e.rowNumber}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export { ENTITY_LABELS };
