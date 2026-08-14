import { Newspaper, Star } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPublishedReviews } from "@/lib/catalog/queries";
import { Link } from "@/lib/i18n/navigation";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function ReviewsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  const reviews = await getPublishedReviews().catch(() => []);

  if (reviews.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <Newspaper className="mx-auto mb-4 h-10 w-10 text-slate-400" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="mt-3 text-slate-500">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-slate-500">{t("subtitle")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <Link
            key={`${review.modelSlug}-${review.year}`}
            href={`/car/${review.modelSlug}/review`}
            className="group rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{review.brandName}</p>
              {review.rating && (
                <span className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {review.rating}
                </span>
              )}
            </div>
            <h2 className="mt-1 font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
              {review.modelName} {review.year}
            </h2>
            {review.summaryExcerpt && (
              <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">
                {review.summaryExcerpt}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
