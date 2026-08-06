import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CarCard } from "@/components/catalog/car-card";
import { getAllActiveModels } from "@/lib/catalog/queries";
import { categoryLabels } from "@/lib/format";
import { Link } from "@/lib/i18n/navigation";

export const revalidate = 3600;

const validCategories = Object.keys(categoryLabels);

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  if (!validCategories.includes(category)) notFound();

  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tCategory = await getTranslations({ locale, namespace: "category" });
  const models = await getAllActiveModels();
  const filtered = models.filter((m) => m.category === category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-600">
            {tCommon("home")}
          </Link>
          {" / "}
          <span className="text-slate-400">{categoryLabels[category]}</span>
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          {categoryLabels[category]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {tCategory("modelsCount", { count: filtered.length })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((model) => (
          <CarCard key={model.id} model={model} locale={locale} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-16 text-center text-slate-500">{tCommon("notFound")}</p>
      )}
    </div>
  );
}
