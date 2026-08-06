"use client";

import { Upload } from "lucide-react";
import { useState, useTransition } from "react";
import type { ImportOutcome } from "@/lib/fenabrave/importer";
import { ImportResult } from "./import-result";

export function ImportForm() {
  const [result, setResult] = useState<ImportOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      startTransition(async () => {
        const formData = new FormData();
        formData.append("file", new Blob([buffer], { type: file.type }), file.name);
        const res = await fetch("/api/admin/imports/fenabrave", { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Erro ao importar arquivo");
          return;
        }
        setResult(await res.json());
      });
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="space-y-4">
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-700 bg-slate-900 p-10 text-center transition-colors hover:border-blue-500"
        htmlFor="fenabrave-file"
      >
        <Upload className="h-8 w-8 text-slate-500" />
        <div>
          <p className="text-sm font-medium text-white">
            {isPending ? "Importando..." : "Clique para selecionar o arquivo XLSX"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Arquivos .xlsx da FENABRAVE</p>
        </div>
        <input
          id="fenabrave-file"
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          disabled={isPending}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {result && <ImportResult result={result} />}
    </div>
  );
}
