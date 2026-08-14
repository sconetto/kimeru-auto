import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { specCategories, specGroup } from "@/lib/db/schema";
import { specGroupLabels } from "@/lib/format";
import { updateSpecCategory } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminEditSpecCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const catId = Number(id);
  const [category] = await db.select().from(specCategories).where(eq(specCategories.id, catId)).limit(1);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/admin/specs" className="text-sm text-blue-400 hover:underline">
          ← Voltar para categorias
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Editar categoria</h1>
        <p className="mt-1 text-sm text-slate-400">{category.name}</p>
      </div>

      <form action={updateSpecCategory} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-5">
        <input type="hidden" name="id" value={category.id} />
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-300">
            Nome
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={category.name}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="unit" className="mb-1.5 block text-sm font-medium text-slate-300">
            Unidade
          </label>
          <input
            id="unit"
            name="unit"
            defaultValue={category.unit ?? ""}
            placeholder="ex: cv, kg, km/l"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="group" className="mb-1.5 block text-sm font-medium text-slate-300">
            Grupo
          </label>
          <select
            id="group"
            name="group"
            defaultValue={category.group}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            {specGroup.enumValues.map((g) => (
              <option key={g} value={g}>
                {specGroupLabels[g] ?? g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="displayOrder" className="mb-1.5 block text-sm font-medium text-slate-300">
            Ordem de exibição
          </label>
          <input
            id="displayOrder"
            name="displayOrder"
            type="number"
            defaultValue={category.displayOrder}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" name="isNumeric" defaultChecked={category.isNumeric} className="h-4 w-4" />
          Valor numérico
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="higherIsBetter"
            defaultChecked={category.higherIsBetter}
            className="h-4 w-4"
          />
          Maior é melhor
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Salvar alterações
        </button>
      </form>
    </div>
  );
}
