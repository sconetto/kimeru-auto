"use client";

import { Trash2 } from "lucide-react";
import { deleteModelYear } from "../cars/actions";

export function DeleteModelYearButton({ id }: { id: number }) {
  return (
    <form
      action={deleteModelYear}
      onSubmit={(e) => {
        if (!confirm(`Excluir esta versão (ID ${id})?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
        aria-label="Excluir versão"
        title="Excluir versão"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
