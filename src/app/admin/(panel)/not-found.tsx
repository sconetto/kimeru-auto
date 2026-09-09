import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold text-white">Página não encontrada</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        A página que você procura não existe ou foi movida.
      </p>
      <Link
        href="/admin"
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
      >
        Voltar ao painel
      </Link>
    </div>
  );
}
