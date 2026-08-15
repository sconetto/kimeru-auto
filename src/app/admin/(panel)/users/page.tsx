import { asc } from "drizzle-orm";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { adminRole, adminUsers } from "@/lib/db/schema";
import { createUser } from "./actions";
import { DeleteUserButton } from "./delete-user-button";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Visualizador",
};

export default async function AdminUsersPage() {
  const users = await db.select().from(adminUsers).orderBy(asc(adminUsers.email));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Usuários</h1>
        <p className="mt-1 text-sm text-slate-400">
          Gerencie contas de acesso ao painel administrativo
        </p>
      </div>

      <form
        action={createUser}
        className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-5"
      >
        <h2 className="text-sm font-medium text-white">Novo usuário</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-300">
              Nome
            </label>
            <input
              id="name"
              name="name"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
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
              defaultValue="viewer"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              {adminRole.enumValues.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r] ?? r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          title="Criar usuário"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Criar usuário
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{u.name ?? u.email}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-slate-400">{roleLabels[u.role] ?? u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.isActive
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {u.isActive ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-blue-400"
                      aria-label="Editar usuário"
                      title="Editar usuário"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <DeleteUserButton id={u.id} email={u.email} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="p-8 text-center text-slate-500">Nenhum usuário cadastrado.</p>
        )}
      </div>
    </div>
  );
}
