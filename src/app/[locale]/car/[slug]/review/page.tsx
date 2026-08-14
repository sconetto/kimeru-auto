import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EditorialContent } from "@/components/editorial/editorial-content";
import { getCarDetail } from "@/lib/catalog/queries";
import { Link } from "@/lib/i18n/navigation";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const car = await getCarDetail(slug, locale as "pt-BR" | "en-US");
  if (!car?.editorial) return {};
  const t = await getTranslations({ locale, namespace: "car" });
  const title = t("reviewMetaTitle", { brand: car.brandName, model: car.modelName });
  const description = t("reviewMetaDescription", {
    brand: car.brandName,
    model: car.modelName,
  });
  return { title, description, openGraph: { title, description, type: "article" } };
}

export default async function CarReviewPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const validLocale = locale as "pt-BR" | "en-US";
  const car = await getCarDetail(slug, validLocale);
  if (!car?.editorial) notFound();

  const t = await getTranslations({ locale, namespace: "car" });
  const ed = car.editorial;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={`/car/${slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToCar")}
      </Link>

      <header className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
        <p className="text-sm text-slate-500">{car.brandName}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          {t("reviewTitle", { brand: car.brandName, model: car.modelName, year: car.year })}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("reviewLabel")} · {t("basedOn")}{" "}
          {ed.sourceVideos.length > 0 ? ed.sourceVideos.length : 0}{" "}
          {ed.sourceVideos.length === 1 ? t("videoSingular") : t("videoPlural")}
        </p>
      </header>

      <EditorialContent
        rating={ed.rating}
        summary={ed.summary}
        scoreBreakdown={ed.scoreBreakdown}
        transcripts={ed.transcripts}
        sourceVideos={ed.sourceVideos}
        basedOnLabel={t("basedOn")}
        seeVideoLabel={t("seeVideo")}
        transcriptsLabel={t("transcripts")}
        reviewLabel={t("reviewLabel")}
        scoreLabels={{
          design: t("scoreDesign"),
          comfort: t("scoreComfort"),
          performance: t("scorePerformance"),
          technology: t("scoreTechnology"),
          value: t("scoreValue"),
        }}
      />
    </div>
  );
}
