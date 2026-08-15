import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { specGroups, vehicleCategories } from "@/lib/db/schema";
import { createSpecGroup, createVehicleCategory } from "./actions";
import { CategoryList, GroupList } from "./type-lists";

export const dynamic = "force-dynamic";

export default async function AdminTypesPage() {
  const categories = await db
    .select()
    .from(vehicleCategories)
    .orderBy(asc(vehicleCategories.displayOrder));
  const groups = await db.select().from(specGroups).orderBy(asc(specGroups.displayOrder));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Tipos e grupos</h1>
        <p className="mt-1 text-sm text-slate-400">
          Gerencie categorias de veículos e grupos de especificações
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-medium text-white">Categorias de veículos</h2>
        <form action={createVehicleCategory} className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            name="name"
            placeholder="Nova categoria (ex: Minivan)"
            required
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            title="Adicionar categoria"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Adicionar
          </button>
        </form>
        <CategoryList items={categories} />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-medium text-white">Grupos de especificações</h2>
        <form action={createSpecGroup} className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            name="name"
            placeholder="Novo grupo (ex: Carroceria)"
            required
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            title="Adicionar grupo de especificações"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Adicionar
          </button>
        </form>
        <GroupList items={groups} />
      </div>
    </div>
  );
}
