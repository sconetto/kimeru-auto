import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/catalog/brand-logo";
import { CarCard } from "@/components/catalog/car-card";
import { getBrandBySlug, getModelsByBrand } from "@/lib/catalog/queries";
import { categoryLabels } from "@/lib/format-labels";
import { Link } from "@/lib/i18n/navigation";

export const revalidate = 3600;

export default async function BrandPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tBrands = await getTranslations({ locale, namespace: "brands" });

  const [brand, models] = await Promise.all([getBrandBySlug(slug), getModelsByBrand(slug)]);

  if (!brand) notFound();

  const byCategory = new Map<string, typeof models>();
  for (const model of models) {
    const key = model.category ?? "outros";
    const list = byCategory.get(key) ?? [];
    list.push(model);
    byCategory.set(key, list);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-600">
            {tCommon("home")}
          </Link>{" "}
          / <span className="text-slate-400">{tBrands("title")}</span>
        </p>
        <div className="mt-2 flex items-center gap-3">
          <BrandLogo logoUrl={brand.logoUrl} name={brand.name} size={48} />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{brand.name}</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {tBrands("modelsAvailable", { count: models.length })}
        </p>
      </div>

      {models.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
          {tBrands("noModels")}
        </p>
      ) : (
        [...byCategory.entries()].map(([category, list]) => (
          <section key={category} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {categoryLabels[category] ?? tBrands("others")}
              <span className="ml-2 text-sm font-normal text-slate-400">({list.length})</span>
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((model) => (
                <CarCard key={model.id} model={model} locale={locale} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
