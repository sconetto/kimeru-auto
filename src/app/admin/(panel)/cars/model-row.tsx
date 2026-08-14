"use client";

import { Gauge, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteModel } from "./actions";

interface ModelRowProps {
  model: {
    id: number;
    name: string;
    slug: string;
    category: string | null;
    isActive: boolean;
    brandId: number;
    brandName: string;
    yearCount: number | null;
    categoryLabel: string;
  };
}

export function ModelRow({ model }: ModelRowProps) {
  return (
    <tr className="border-b border-slate-800 last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium text-white">{model.name}</p>
        <p className="text-xs text-slate-500">/{model.slug}</p>
      </td>
      <td className="px-4 py-3 text-slate-400">{model.brandName}</td>
      <td className="px-4 py-3 text-slate-400">{model.categoryLabel}</td>
      <td className="px-4 py-3 text-slate-400">{model.yearCount ?? 0}</td>
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
