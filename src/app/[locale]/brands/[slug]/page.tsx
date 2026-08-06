import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CarCard } from "@/components/catalog/car-card";
import { getModelsByBrand } from "@/lib/catalog/queries";
import { categoryLabels } from "@/lib/format";
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
  const models = await getModelsByBrand(slug);

  if (models.length === 0) notFound();

  const brandName = models[0].brandName;

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
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{brandName}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {tBrands("modelsAvailable", { count: models.length })}
        </p>
      </div>

      {[...byCategory.entries()].map(([category, list]) => (
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
      ))}
    </div>
  );
}
