"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // biome-ignore lint/suspicious/noConsole: error boundaries log failures for observability
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-white">Algo deu errado</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        Ocorreu um erro inesperado. Tente novamente.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
      >
        Tentar novamente
      </button>
    </div>
  );
}
