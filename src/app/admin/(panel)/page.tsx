import { count, eq, sql } from "drizzle-orm";
import { Car, FolderTree, Gauge, Layers } from "lucide-react";
import { db } from "@/lib/db";
import { brands, models, modelYears, specCategories, specValues } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [brandCount] = await db
    .select({ value: count() })
    .from(brands)
    .where(eq(brands.isActive, true));
  const [modelCount] = await db
    .select({ value: count() })
    .from(models)
    .where(eq(models.isActive, true));
  const [yearCount] = await db.select({ value: count() }).from(modelYears);
  const [specCatCount] = await db.select({ value: count() }).from(specCategories);

  // Spec coverage: % of model years that have at least one spec value
  const [coverage] = await db
    .select({
      value: sql<number>`round((count(distinct ${specValues.modelYearId})::numeric / nullif(count(distinct ${modelYears.id}), 0)::numeric) * 100)`,
    })
    .from(modelYears)
    .leftJoin(specValues, eq(specValues.modelYearId, modelYears.id));

  const stats = [
    { label: "Marcas ativas", value: brandCount.value, icon: FolderTree },
    { label: "Modelos ativos", value: modelCount.value, icon: Car },
    { label: "Versões (model year)", value: yearCount.value, icon: Layers },
    { label: "Categorias de espec.", value: specCatCount.value, icon: Gauge },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Visão geral do catálogo de veículos</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{stat.label}</p>
                <Icon className="h-5 w-5 text-blue-500" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">Cobertura de especificações</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${Number(coverage?.value ?? 0)}%` }}
            />
          </div>
          <span className="text-lg font-bold text-white">{Number(coverage?.value ?? 0)}%</span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Percentual de versões cadastradas com pelo menos uma especificação preenchida.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-medium text-white">Última sincronização FIPE</h2>
          <p className="mt-2 text-sm text-slate-500">Nenhuma sincronização executada ainda.</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-medium text-white">Última importação FENABRAVE</h2>
          <p className="mt-2 text-sm text-slate-500">Nenhuma importação executada ainda.</p>
        </div>
      </div>
    </div>
  );
}
