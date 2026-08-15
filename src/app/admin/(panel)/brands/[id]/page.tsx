import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminImageUpload } from "@/components/admin/admin-image-upload";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { updateBrand } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminEditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brandId = Number(id);
  const [brand] = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
  if (!brand) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/admin/brands" className="text-sm text-blue-400 hover:underline">
          ← Voltar para marcas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Editar marca</h1>
        <p className="mt-1 text-sm text-slate-400">{brand.name}</p>
      </div>

      <form
        action={updateBrand}
        className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-5"
      >
        <input type="hidden" name="id" value={brand.id} />
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-300">
            Nome
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={brand.name}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="originCountry"
            className="mb-1.5 block text-sm font-medium text-slate-300"
          >
            País de origem
          </label>
          <input
            id="originCountry"
            name="originCountry"
            defaultValue={brand.originCountry ?? ""}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <AdminImageUpload name="logoUrl" label="Logo" value={brand.logoUrl} />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={brand.isActive}
            className="h-4 w-4"
          />
          Marca ativa
        </label>
        <button
          type="submit"
          title="Salvar alterações"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Salvar alterações
        </button>
      </form>
    </div>
  );
}
