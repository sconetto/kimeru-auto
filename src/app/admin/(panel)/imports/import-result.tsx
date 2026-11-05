import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ImportOutcome } from "@/lib/fenabrave/importer";

export function ImportResult({ result }: { result: ImportOutcome }) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        <h3 className="font-medium text-white">Importação concluída: {result.referenceLabel}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
        <div className="rounded-md bg-slate-800 p-3">
          <p className="text-2xl font-bold text-white">{result.coverage.total}</p>
          <p className="text-xs text-slate-400">Linhas no arquivo</p>
        </div>
        <div className="rounded-md bg-slate-800 p-3">
          <p className="text-2xl font-bold text-emerald-400">{result.coverage.matched}</p>
          <p className="text-xs text-slate-400">Reconhecidas</p>
        </div>
        <div className="rounded-md bg-slate-800 p-3">
          <p className="text-2xl font-bold text-blue-400">{result.coverage.created}</p>
          <p className="text-xs text-slate-400">Modelos criados</p>
        </div>
        <div className="rounded-md bg-slate-800 p-3">
          <p
            className={`text-2xl font-bold ${result.coverage.unmatched > 0 ? "text-amber-400" : "text-slate-500"}`}
          >
            {result.coverage.unmatched}
          </p>
          <p className="text-xs text-slate-400">Não reconhecidas</p>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {result.imported} modelo(s) gravado(s) com os dados deste arquivo.
      </p>

      {result.coverage.created > 0 && (
        <p className="rounded-md bg-blue-500/10 p-3 text-sm text-blue-300">
          {result.coverage.created} modelo(s) não existiam no catálogo e foram criados como
          provisórios, já com as vendas registradas.{" "}
          <a href="/admin/enrichment" className="underline hover:text-blue-200">
            Revisar a fila de enriquecimento
          </a>
          .
        </p>
      )}

      {result.warnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <ul className="space-y-1">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {result.unmatched.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-400">
            <AlertTriangle className="h-4 w-4" /> Modelos não reconhecidos
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-slate-300">
            {result.unmatched.map((u) => (
              <li key={`${u.position}-${u.rawName}`} className="flex gap-2">
                <span className="w-8 shrink-0 text-slate-500">#{u.position}</span>
                <span>{u.rawName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
