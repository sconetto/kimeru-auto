"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Link } from "@/lib/i18n/navigation";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    // biome-ignore lint/suspicious/noConsole: error boundaries log failures for observability
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("errorTitle")}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">{t("errorDescription")}</p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          {t("retry")}
        </button>
        <Link
          href="/"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
