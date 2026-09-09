"use client";

import { useFormStatus } from "react-dom";
import type { Brand, VehicleCategory } from "@/lib/db/schema";
import { updateModel } from "../actions";

const inputClass =
  "rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none";

export function ModelEditForm({
  model,
  brands,
  categories,
}: {
  model: {
    id: number;
    brandId: number;
    name: string;
    category: string | null;
    sizeCategory: string | null;
    imageUrl: string | null;
    isActive: boolean;
  };
  brands: Brand[];
  categories: VehicleCategory[];
}) {
  return (
    <form
      action={updateModel}
      className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-5"
    >
      <input type="hidden" name="id" value={model.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-500">
          Marca
          <select
            name="brandId"
            required
            defaultValue={model.brandId}
            className={`mt-1 w-full ${inputClass}`}
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Nome
          <input
            name="name"
            required
            defaultValue={model.name}
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
        <label className="text-xs text-slate-500">
          Categoria
          <select
            name="category"
            defaultValue={model.category ?? ""}
            className={`mt-1 w-full ${inputClass}`}
          >
            <option value="">Selecione</option>
            {categories
              .filter((c) => c.isActive)
              .map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Porte
          <input
            name="sizeCategory"
            defaultValue={model.sizeCategory ?? ""}
            placeholder="compacto"
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
        <label className="text-xs text-slate-500 sm:col-span-2">
          URL da imagem
          <input
            name="imageUrl"
            defaultValue={model.imageUrl ?? ""}
            placeholder="https://..."
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={model.isActive}
          className="accent-blue-600"
        />
        Ativo (visível no catálogo)
      </label>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
    >
      {pending ? "Salvando..." : "Salvar alterações"}
    </button>
  );
}
