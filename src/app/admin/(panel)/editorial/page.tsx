import { and, asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  adminUsers,
  brands,
  editorial,
  editorialLocale,
  models,
  modelYears,
} from "@/lib/db/schema";
import { EditorialPanel } from "./editorial-panel";
import { EditorialRowActions } from "./editorial-row-actions";

export const dynamic = "force-dynamic";

const localeLabels: Record<string, string> = { "pt-BR": "PT-BR", "en-US": "EN-US" };

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

export default async function AdminEditorialPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; locale?: string }>;
}) {
  const { status, locale } = await searchParams;

  const rows = await db
    .select({
      modelYearId: modelYears.id,
      modelName: models.name,
      brandName: brands.name,
      year: modelYears.year,
    })
    .from(modelYears)
    .innerJoin(models, eq(models.id, modelYears.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .orderBy(asc(brands.name), asc(models.name), desc(modelYears.year));

  const staged = await db
    .select({ modelYearId: editorial.modelYearId, locale: editorial.locale })
    .from(editorial)
    .where(and(eq(editorial.published, false), eq(editorial.aiGenerated, true)));

  const stagedKeys = new Set(staged.map((s) => `${s.modelYearId}:${s.locale}`));

  const filters = [];
  if (status === "published") filters.push(eq(editorial.published, true));
  if (status === "draft") filters.push(eq(editorial.published, false));
  if (locale && (locale === "pt-BR" || locale === "en-US")) {
    filters.push(eq(editorial.locale, locale));
  }

  const listRows = await db
    .select({
      id: editorial.id,
      modelYearId: editorial.modelYearId,
      locale: editorial.locale,
      rating: editorial.rating,
      aiGenerated: editorial.aiGenerated,
      published: editorial.published,
      updatedAt: editorial.updatedAt,
      modelName: models.name,
      brandName: brands.name,
      year: modelYears.year,
      reviewerName: adminUsers.name,
    })
    .from(editorial)
    .innerJoin(modelYears, eq(modelYears.id, editorial.modelYearId))
    .innerJoin(models, eq(models.id, modelYears.modelId))
    .innerJoin(brands, eq(brands.id, models.brandId))
    .leftJoin(adminUsers, eq(adminUsers.id, editorial.reviewedBy))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(editorial.updatedAt));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Conteúdo editorial</h1>
        <p className="mt-1 text-sm text-slate-400">
          Gere conteúdo com IA a partir de reviews no YouTube, revise e publique.
        </p>
      </div>

      <EditorialPanel cars={rows} stagedKeys={stagedKeys} />

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Todos os conteúdos</h2>
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/admin/editorial"
              className={`rounded-md px-2.5 py-1 ${!status ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Todos
            </Link>
            <Link
              href="/admin/editorial?status=published"
              className={`rounded-md px-2.5 py-1 ${status === "published" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Publicados
            </Link>
            <Link
              href="/admin/editorial?status=draft"
              className={`rounded-md px-2.5 py-1 ${status === "draft" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Rascunhos
            </Link>
            <span className="mx-1 text-slate-600">|</span>
            {editorialLocale.enumValues.map((l) => (
              <Link
                key={l}
                href={`/admin/editorial?locale=${l}`}
                className={`rounded-md px-2.5 py-1 ${locale === l ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                {localeLabels[l]}
              </Link>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Veículo</th>
              <th className="px-4 py-3">Idioma</th>
              <th className="px-4 py-3">Nota</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Revisão</th>
              <th className="px-4 py-3">Atualizado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {listRows.map((row) => (
              <tr key={row.id} className="border-b border-slate-800 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">
                    {row.brandName} {row.modelName} {row.year}
                  </p>
                  <p className="text-xs text-slate-500">ID {row.modelYearId}</p>
                </td>
                <td className="px-4 py-3 text-slate-400">{localeLabels[row.locale] ?? row.locale}</td>
                <td className="px-4 py-3 text-slate-400">{row.rating ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.published
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {row.published ? "Publicado" : "Rascunho"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.aiGenerated
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {row.aiGenerated ? "IA (sem revisão)" : "Revisado"}
                  </span>
                  {row.reviewerName && (
                    <p className="mt-0.5 text-xs text-slate-500">por {row.reviewerName}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400">{formatDate(row.updatedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/admin/editorial/${row.modelYearId}`}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                    >
                      Editar
                    </Link>
                    <EditorialRowActions id={row.id} published={row.published} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {listRows.length === 0 && (
          <p className="p-8 text-center text-slate-500">Nenhum conteúdo editorial encontrado.</p>
        )}
      </div>
    </div>
  );
}
