import { and, count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { AdminBadge, AdminEmptyState, AdminPagination } from "@/components/admin/admin-ui";
import { db } from "@/lib/db";
import { adminAuditLog, adminUsers } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const actionTones: Record<string, "green" | "amber" | "blue" | "gray" | "red"> = {
  create: "green",
  update: "blue",
  delete: "red",
  toggle_active: "amber",
  import: "amber",
  publish: "blue",
  ai_generate: "amber",
  login: "gray",
  logout: "gray",
};

const actionLabels: Record<string, string> = {
  create: "Criar",
  update: "Atualizar",
  delete: "Excluir",
  toggle_active: "Alternar status",
  import: "Importar",
  publish: "Publicar",
  ai_generate: "IA",
  login: "Login",
  logout: "Logout",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; page?: string }>;
}) {
  const { action, entity, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const filters = [];
  if (action && (actionLabels as Record<string, string>)[action]) {
    filters.push(eq(adminAuditLog.action, action as never));
  }
  if (entity && entity.trim()) {
    filters.push(eq(adminAuditLog.entityType, entity.trim()));
  }

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(adminAuditLog)
    .where(where);
  const totalPages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const rows = await db
    .select({
      id: adminAuditLog.id,
      action: adminAuditLog.action,
      entityType: adminAuditLog.entityType,
      entityId: adminAuditLog.entityId,
      details: adminAuditLog.details,
      createdAt: adminAuditLog.createdAt,
      adminEmail: adminUsers.email,
      adminName: adminUsers.name,
    })
    .from(adminAuditLog)
    .leftJoin(adminUsers, eq(adminUsers.id, adminAuditLog.adminId))
    .where(where)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);

  function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(d);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Auditoria</h1>
        <p className="mt-1 text-sm text-slate-400">
          Registro de ações administrativas (somente leitura)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/admin/audit"
            className={`rounded-md px-2.5 py-1 text-xs ${!action ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            Todas
          </Link>
          {Object.entries(actionLabels).map(([key, label]) => (
            <Link
              key={key}
              href={`/admin/audit?action=${key}${entity ? `&entity=${entity}` : ""}`}
              className={`rounded-md px-2.5 py-1 text-xs ${action === key ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">Alvo</th>
              <th className="px-4 py-3">Autor</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-800 last:border-0">
                <td className="px-4 py-3">
                  <AdminBadge tone={actionTones[row.action] ?? "gray"}>
                    {actionLabels[row.action] ?? row.action}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  <span className="font-medium text-slate-300">{row.entityType}</span>
                  {row.entityId != null && <span className="text-slate-500"> #{row.entityId}</span>}
                </td>
                <td className="px-4 py-3 text-slate-400">{row.adminName ?? row.adminEmail ?? "—"}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(row.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <AdminEmptyState message="Nenhum registro de auditoria encontrado." />
        )}
        <AdminPagination page={safePage} totalPages={totalPages} total={total} />
      </div>
    </div>
  );
}
