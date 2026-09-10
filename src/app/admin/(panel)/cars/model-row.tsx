"use client";

import { Gauge, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteModel } from "./actions";
import type { CarTableModel } from "./cars-table";

export function ModelRow({ model }: { model: CarTableModel }) {
  return (
    <tr className="border-b border-slate-800 last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium text-white">{model.name}</p>
        <p className="text-xs text-slate-500">/{model.slug}</p>
      </td>
      <td className="px-4 py-3 text-slate-400">{model.brandName}</td>
      <td className="px-4 py-3 text-slate-400">{model.categoryLabel}</td>
      <td className="px-4 py-3">
        {model.versions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {model.versions.map((v) => (
              <span
                key={v.id}
                className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
              >
                {v.name}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-600">{model.yearCount ?? 0}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <Link
            href={`/admin/cars/${model.id}`}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-blue-400"
            title="Editar modelo"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <Link
            href={`/admin/model-years?modelId=${model.id}`}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-blue-400"
            title="Versões e especificações"
          >
            <Gauge className="h-4 w-4" />
          </Link>
          <form
            action={deleteModel}
            onSubmit={(e) => {
              if (!confirm(`Excluir ${model.name}?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={model.id} />
            <button
              type="submit"
              className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
              aria-label="Excluir modelo"
              title="Excluir modelo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
