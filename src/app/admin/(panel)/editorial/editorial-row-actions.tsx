"use client";

import { EyeOff, Trash2 } from "lucide-react";
import { deleteEditorial, unpublishEditorial } from "./actions";

export function EditorialRowActions({ id, published }: { id: number; published: boolean }) {
  return (
    <div className="flex justify-end gap-1">
      {published && (
        <form
          action={unpublishEditorial}
          onSubmit={(e) => {
            if (!confirm("Despublicar este conteúdo? Ele ficará oculto no site.")) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-amber-400"
            aria-label="Despublicar"
            title="Despublicar"
          >
            <EyeOff className="h-4 w-4" />
          </button>
        </form>
      )}
      <form
        action={deleteEditorial}
        onSubmit={(e) => {
          if (!confirm("Excluir permanentemente este conteúdo? Esta ação não pode ser desfeita.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
          aria-label="Excluir conteúdo"
          title="Excluir conteúdo"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
