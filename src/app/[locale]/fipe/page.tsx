import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FipeLookup } from "./fipe-lookup";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "fipe" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export const revalidate = 3600;

export default async function FipePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "fipe" });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-slate-500">{t("subtitle")}</p>

      <div className="mt-8">
        <FipeLookup />
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Fonte: FIPE — Fundação Instituto de Pesquisas Econômicas. Os valores são preços médios de
        referência e podem variar conforme a região e o estado de conservação do veículo.
      </p>
    </div>
  );
}
