import { Sparkles } from "lucide-react";
import Link from "next/link";
import { getEnrichmentQueue } from "@/lib/fenabrave/enrichment";
import { markModelEnriched } from "./actions";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  enriched: "Modelo ativado e removido da fila.",
  "no-variants": "Adicione ao menos uma versão antes de ativar o modelo.",
  invalid: "Modelo inválido.",
};

const NOTICE_TONES: Record<string, string> = {
  enriched: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "no-variants": "border-amber-500/30 bg-amber-500/10 text-amber-300",
  invalid: "border-red-500/30 bg-red-500/10 text-red-300",
};

export default async function EnrichmentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const noticeKey = typeof query.notice === "string" ? query.notice : null;
  const notice = noticeKey ? NOTICES[noticeKey] : null;
  const queue = await getEnrichmentQueue();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Fila de enriquecimento</h1>
        <p className="mt-1 text-sm text-slate-400">
          Modelos criados automaticamente pela sincronização FENABRAVE porque não existiam no
          catálogo. Ficam ocultos do site até receberem versões, preço e especificações. As vendas
          já estão registradas.
        </p>
      </div>

      {notice && noticeKey && (
        <div className={`rounded-md border px-4 py-3 text-sm ${NOTICE_TONES[noticeKey] ?? ""}`}>
          {notice}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 p-16 text-center">
          <Sparkles className="mb-4 h-12 w-12 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-300">Fila vazia</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Nenhum modelo pendente. Novos modelos aparecem aqui quando a importação FENABRAVE
            encontra um nome que ainda não existe no catálogo.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3 text-right">Meses com vendas</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((row) => (
                <tr key={row.modelId} className="border-b border-slate-800/50 last:border-0">
                  <td className="px-4 py-3 text-slate-400">{row.brandName}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">{row.modelName}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{row.monthsWithSales}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-200">
                    {row.totalUnits.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/cars/${row.modelId}`}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                      >
                        Enriquecer
                      </Link>
                      <form action={markModelEnriched}>
                        <input type="hidden" name="modelId" value={row.modelId} />
                        <button
                          type="submit"
                          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
                        >
                          Ativar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
