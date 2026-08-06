import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FinancingCalculator } from "./financing-calculator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "financing" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function FinancingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ price?: string; model?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "financing" });
  const { price, model } = await searchParams;
  const initialPrice = price ? Number(price) : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-2 max-w-2xl text-slate-500">{t("subtitle")}</p>
      {model && (
        <p className="mt-3 inline-block rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
          {model}
        </p>
      )}

      <div className="mt-8">
        <FinancingCalculator initialPrice={initialPrice} />
      </div>
    </div>
  );
}
