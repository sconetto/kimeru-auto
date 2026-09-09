import { AiImportForm } from "./ai-import-form";

export default function AiImportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-xl font-bold text-white">Importar carro com IA</h1>
      <p className="mb-6 text-sm text-slate-400">
        Cole a URL de um PDF, site ou vídeo para extrair as informações completas do carro. O
        resultado é exibido para revisão antes de criar o modelo.
      </p>
      <AiImportForm />
    </div>
  );
}
