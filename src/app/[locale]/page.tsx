import { getTranslations } from "next-intl/server";
import { SearchCars } from "@/components/catalog/search-cars";
import { getAllActiveModels, getBrandsWithCounts } from "@/lib/catalog/queries";
import { Link } from "@/lib/i18n/navigation";

export const revalidate = 3600;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  const [brands, models] = await Promise.all([
    getBrandsWithCounts().catch(() => []),
    getAllActiveModels().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <section className="mb-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white sm:p-12">
        <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">{t("heroTitle")}</h1>
        <p className="mt-3 max-w-xl text-blue-100">{t("heroSubtitle")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/compare"
            className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
          >
            {t("compareCars")}
          </Link>
          <Link
            href="/financing"
            className="rounded-md border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            {t("simulateFinancing")}
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <SearchCars models={models} />
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("brands")}</h2>
          <p className="text-sm text-slate-500">{t("brandCount", { count: brands.length })}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="group flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {brand.name.charAt(0)}
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                  {brand.name}
                </p>
                <p className="text-xs text-slate-500">
                  {t("modelCount", { count: brand.modelCount })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
