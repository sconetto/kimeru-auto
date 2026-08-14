"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { SpecCategory } from "@/lib/db/schema";
import { deleteSpecCategory } from "./actions";

export function SpecCategoryRow({ category }: { category: SpecCategory }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <div>
        <p className="text-white">
          {category.name}
          {category.unit ? (
            <span className="ml-1 text-xs text-slate-500">({category.unit})</span>
          ) : null}
        </p>
        <p className="text-xs text-slate-500">
          {category.isNumeric
            ? `Numérico · ${category.higherIsBetter ? "maior é melhor" : "menor é melhor"}`
            : "Texto"}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Link
          href={`/admin/specs/${category.id}`}
          className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-blue-400"
          aria-label="Editar categoria"
          title="Editar categoria"
        >
          <Pencil className="h-4 w-4" />
        </Link>
        <form
          action={deleteSpecCategory}
          onSubmit={(e) => {
            if (!confirm(`Excluir "${category.name}"?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={category.id} />
          <button
            type="submit"
            className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
            aria-label="Excluir categoria"
            title="Excluir categoria"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
