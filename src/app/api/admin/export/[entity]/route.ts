import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { exportEntity, toCsv } from "@/lib/catalog/bulk";
import { EXPORTABLE_ENTITIES } from "@/lib/catalog/bulk-entities";

export const dynamic = "force-dynamic";

/** GET /api/admin/export/[entity] — download catalog data as CSV (admin/editor). */
export async function GET(_request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const guard = await requireAdmin({ minRole: "editor" });
  if (!guard.ok) return guard.response;

  const { entity } = await params;
  if (!(EXPORTABLE_ENTITIES as readonly string[]).includes(entity)) {
    return NextResponse.json({ error: "Entidade inválida" }, { status: 400 });
  }

  const data = await exportEntity(entity);
  if (!data) {
    return NextResponse.json({ error: "Entidade inválida" }, { status: 400 });
  }

  const csv = toCsv(data.headers, data.rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${entity}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
