import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function AdminImportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Importar dados FENABRAVE</h1>
        <p className="mt-1 text-sm text-slate-400">
          Envie o arquivo XLSX mensal de emplacamentos da FENABRAVE para atualizar o ranking de
          vendas.
        </p>
      </div>

      <ImportForm />

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-2 text-sm font-medium text-white">Formato esperado</h2>
        <p className="text-sm text-slate-400">
          Planilha com colunas:{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">POS</code>,{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">MARCA/MODELO</code>,{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">unidades do mês</code>.
          Modelos não reconhecidos são listados para revisão após a importação.
        </p>
      </div>
    </div>
  );
}
