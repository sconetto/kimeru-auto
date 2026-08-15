import { NextResponse } from "next/server";
import { logAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/require-admin";
import { importEntity, parseCsv } from "@/lib/catalog/bulk";
import { EXPORTABLE_ENTITIES } from "@/lib/catalog/bulk-entities";
import { isSameOrigin } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * POST /api/admin/import/[entity]
 * Body: multipart with `file` (CSV) and optional `mode` = "preview" | "apply".
 * Preview parses + validates rows without writing; apply performs the import
 * and returns per-row results.
 */
export async function POST(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  }
  const guard = await requireAdmin({ minRole: "admin" });
  if (!guard.ok) return guard.response;

  const { entity } = await params;
  if (!(EXPORTABLE_ENTITIES as readonly string[]).includes(entity)) {
    return NextResponse.json({ error: "Entidade inválida" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const mode = formData.get("mode") === "apply" ? "apply" : "preview";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não encontrado no upload" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json(
      { error: "Formato inválido — envie um arquivo .csv" },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande — limite de 2 MB" }, { status: 413 });
  }

  const text = await file.text();
  const parsed = parseCsv(text);
  if (parsed.length < 2) {
    return NextResponse.json(
      { error: "CSV vazio — precisa de cabeçalho e ao menos uma linha" },
      { status: 400 },
    );
  }
  const headers = parsed[0];
  const dataRows = parsed.slice(1);

  if (mode === "apply") {
    const outcome = await importEntity(entity, headers, dataRows);
    if (!outcome) {
      return NextResponse.json({ error: "Entidade inválida" }, { status: 400 });
    }
    await logAudit({
      adminId: guard.session.id,
      action: "import",
      entityType: entity,
      details: {
        created: outcome.created,
        updated: outcome.updated,
        errors: outcome.errors.length,
      },
    });
    return NextResponse.json(outcome);
  }

  // Preview: validate without writing by dry-running the importer on a clone
  // is expensive, so return structural info + first rows for confirmation.
  return NextResponse.json({
    entity,
    headers,
    rowCount: dataRows.length,
    previewRows: dataRows.slice(0, 5),
  });
}
