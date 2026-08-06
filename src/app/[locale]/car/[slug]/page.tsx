import { Calculator, Scale, TrendingUp, Video } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SpecTable } from "@/components/compare/spec-table";
import { PriceHistoryChart } from "@/components/fipe/price-history-chart";
import { SalesSparkline } from "@/components/fipe/sales-sparkline";
import { getCarDetail, getSalesTrend } from "@/lib/catalog/queries";
import { formatBRL, formatPercent, fuelLabels } from "@/lib/format";
import { Link } from "@/lib/i18n/navigation";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const car = await getCarDetail(slug);
  if (!car) return {};

  const t = await getTranslations({ locale, namespace: "car" });
  const title = t("metaTitle", { brand: car.brandName, model: car.modelName, year: car.year });
  const description = t("metaDescription", {
    brand: car.brandName,
    model: car.modelName,
    year: car.year,
    price: formatBRL(car.priceFipe),
  });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: car.imageUrl ? [{ url: car.imageUrl }] : [],
    },
  };
}

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const car = await getCarDetail(slug, locale as "pt-BR" | "en-US");
  if (!car) notFound();
  const salesTrend = car.sales ? await getSalesTrend(car.sales.modelYearId).catch(() => []) : [];

  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tCar = await getTranslations({ locale, namespace: "car" });

  // JSON-LD for structured-data crawlers. `<`/`>` are escaped so DB-controlled
  // field values can never terminate the script tag (XSS via JSON-LD breakout).
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Car",
    name: `${car.brandName} ${car.modelName}`,
    brand: { "@type": "Brand", name: car.brandName },
    model: car.modelName,
    vehicleModelDate: String(car.year),
    fuelType: fuelLabels[car.fuelType] ?? car.fuelType,
    offers: car.priceFipe
      ? {
          "@type": "Offer",
          price: String(Number(car.priceFipe)),
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        }
      : undefined,
  })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD with <, > escaped via \u003c/\u003e
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      {/* Breadcrumb */}
      <p className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-600">
          {tCommon("home")}
        </Link>
        {" / "}
        <Link href={`/brands/${car.brandSlug}`} className="hover:text-blue-600">
          {car.brandName}
        </Link>
        {" / "}
        <span className="text-slate-400">{car.modelName}</span>
      </p>

      {/* Header */}
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              {car.brandName} {car.modelName}
            </h1>
            {car.sales?.rankingPosition && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                {tCar("moreSold", { rank: car.sales.rankingPosition })}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {car.year} · {fuelLabels[car.fuelType] ?? car.fuelType}
            {car.isZeroKm ? " · 0km" : ""}
            {car.fipeCode ? ` · ${tCar("fipeCode", { code: car.fipeCode })}` : ""}
          </p>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/compare?car=${car.modelSlug}`}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <Scale className="h-4 w-4" />
              {tCar("compare")}
            </Link>
            <Link
              href={`/financing?price=${car.priceFipe ?? ""}`}
              className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Calculator className="h-4 w-4" />
              {tCar("simulateFinancing")}
            </Link>
          </div>
        </div>

        {/* Price card */}
        <div className="h-fit rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">
            {car.isZeroKm ? tCar("priceZeroKm") : tCar("priceFipe")}
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
            {formatBRL(car.priceFipe)}
          </p>
          {car.depreciation12m !== null && (
            <p className="mt-2 text-sm">
              <span className="text-slate-500">{tCar("depreciation12m")}: </span>
              <span
                className={`font-semibold ${car.depreciation12m <= 0 ? "text-red-600" : "text-emerald-600"}`}
              >
                {formatPercent(car.depreciation12m)}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Specs */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            {tCar("specs")}
          </h2>
          <SpecTable specs={car.specs} />
        </section>

        {/* Sidebar: editorial + price history */}
        <aside className="space-y-6">
          {car.editorial && (
            <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  {tCar("editorial")}
                </h2>
                {car.editorial.rating && (
                  <span className="rounded-md bg-blue-600 px-2 py-1 text-sm font-bold text-white">
                    {car.editorial.rating}
                  </span>
                )}
              </div>

              {car.editorial.summary && (
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {car.editorial.summary}
                </p>
              )}

              {car.editorial.pros.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {tCar("pros")}
                  </p>
                  <ul className="space-y-1.5">
                    {car.editorial.pros.map((pro) => (
                      <li
                        key={pro}
                        className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"
                      >
                        <span className="text-emerald-500">✓</span> {pro}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {car.editorial.cons.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">
                    {tCar("cons")}
                  </p>
                  <ul className="space-y-1.5">
                    {car.editorial.cons.map((con) => (
                      <li
                        key={con}
                        className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"
                      >
                        <span className="text-red-500">✗</span> {con}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {car.editorial.sourceVideos.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Video className="h-3.5 w-3.5" /> {tCar("basedOn")}
                  </p>
                  <ul className="space-y-1">
                    {car.editorial.sourceVideos.map((v) => (
                      <li key={v.url}>
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {v.title ?? tCar("seeVideo")}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">
              {tCar("priceHistory")}
            </h2>
            <PriceHistoryChart history={car.priceHistory} depreciation12m={car.depreciation12m} />
          </section>

          {car.sales && (
            <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                <TrendingUp className="h-4 w-4 text-blue-600" /> {tCar("salesData")}
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">{tCar("ranking")}</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    #{car.sales.rankingPosition ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">{tCar("unitsPerMonth")}</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {car.sales.unitsSold?.toLocaleString(locale) ?? "—"}
                  </p>
                </div>
              </div>
              {salesTrend.length >= 2 && (
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="mb-1 text-xs text-slate-500">{tCar("monthlyTrend")}</p>
                  <SalesSparkline data={salesTrend} />
                </div>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
