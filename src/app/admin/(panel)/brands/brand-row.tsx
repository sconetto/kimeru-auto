"use client";

import { Power, Trash2 } from "lucide-react";
import { deleteBrand, toggleBrand } from "./actions";

interface BrandRowProps {
  brand: {
    id: number;
    name: string;
    slug: string;
    originCountry: string | null;
    isActive: boolean;
    modelCount: number;
  };
}

export function BrandRow({ brand }: BrandRowProps) {
  return (
    <tr className="border-b border-slate-800 last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium text-white">{brand.name}</p>
        <p className="text-xs text-slate-500">/{brand.slug}</p>
      </td>
      <td className="px-4 py-3 text-slate-400">{brand.originCountry ?? "—"}</td>
      <td className="px-4 py-3 text-slate-400">{brand.modelCount}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            brand.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
          }`}
        >
          {brand.isActive ? "Ativa" : "Inativa"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <form action={toggleBrand}>
            <input type="hidden" name="id" value={brand.id} />
            <button
              type="submit"
              className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-amber-400"
              aria-label={brand.isActive ? "Desativar" : "Ativar"}
              title={brand.isActive ? "Desativar" : "Ativar"}
            >
              <Power className="h-4 w-4" />
            </button>
          </form>
          <form
            action={deleteBrand}
            onSubmit={(e) => {
              if (!confirm(`Excluir ${brand.name}?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={brand.id} />
            <button
              type="submit"
              className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
              aria-label="Excluir"
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
