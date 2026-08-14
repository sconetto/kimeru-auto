import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { specCategories, specGroups } from "@/lib/db/schema";
import { specGroupLabels } from "@/lib/format";
import { ImportExportControls } from "@/components/admin/import-export-controls";
import { NewSpecCategoryForm } from "./new-spec-category-form";
import { SpecCategoryRow } from "./spec-category-row";

export const dynamic = "force-dynamic";

export default async function AdminSpecsPage() {
  const rows = await db
    .select()
    .from(specCategories)
    .orderBy(asc(specCategories.group), asc(specCategories.displayOrder));
  const groups = await db.select().from(specGroups).orderBy(asc(specGroups.displayOrder));

  const byGroup = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byGroup.get(row.group) ?? [];
    list.push(row);
    byGroup.set(row.group, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Categorias de especificação</h1>
        <p className="mt-1 text-sm text-slate-400">Defina os campos comparáveis entre veículos</p>
        <div className="mt-3">
          <ImportExportControls entity="specs" />
        </div>
      </div>

      <NewSpecCategoryForm groups={groups} />

      <div className="grid gap-6 lg:grid-cols-2">
        {[...byGroup.entries()].map(([group, cats]) => (
          <div key={group} className="rounded-lg border border-slate-800 bg-slate-900">
            <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-white">
              {specGroupLabels[group] ?? group}
              <span className="ml-2 text-xs font-normal text-slate-500">({cats.length})</span>
            </h2>
            <div className="divide-y divide-slate-800">
              {cats.map((cat) => (
                <SpecCategoryRow key={cat.id} category={cat} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
