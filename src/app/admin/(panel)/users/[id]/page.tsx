import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { adminRole, adminUsers } from "@/lib/db/schema";
import { updateUser } from "../actions";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Visualizador",
};

export default async function AdminEditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId)).limit(1);
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-blue-400 hover:underline">
          ← Voltar para usuários
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Editar usuário</h1>
        <p className="mt-1 text-sm text-slate-400">{user.email}</p>
      </div>

      <form
        action={updateUser}
        className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-5"
      >
        <input type="hidden" name="id" value={user.id} />
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-300">
            Nome
          </label>
          <input
            id="name"
            name="name"
            defaultValue={user.name ?? ""}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-slate-300">
            Papel
          </label>
          <select
            id="role"
            name="role"
            defaultValue={user.role}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            {adminRole.enumValues.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r] ?? r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
            Nova senha <span className="text-xs text-slate-500">(deixe vazio para manter)</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={user.isActive}
            className="h-4 w-4"
          />
          Usuário ativo
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
