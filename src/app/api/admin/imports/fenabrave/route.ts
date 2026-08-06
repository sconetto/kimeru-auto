import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { importFenabraveReport } from "@/lib/fenabrave/importer";
import { isSameOrigin } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** POST /api/admin/imports/fenabrave — admin-only XLSX import. */
export async function POST(request: Request) {
  // CSRF: multipart/form-data uploads get no implicit same-origin protection,
  // so reject cross-origin POSTs outright.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  }

  const guard = await requireAdmin({ minRole: "admin" });
  if (!guard.ok) return guard.response;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não encontrado no upload" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
    return NextResponse.json(
      { error: "Formato inválido — envie um arquivo .xlsx" },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande — limite de 10 MB" }, { status: 413 });
  }

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Magic-byte sniffing: .xlsx is a ZIP archive (PK\x03\x04), .xls is an
    // OLE2 compound document (\xD0\xCF\x11\xE0). Catches renamed/malformed
    // uploads before they reach the parser.
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    const isOle2 = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
    const isXlsx = file.name.toLowerCase().endsWith(".xlsx");
    const isXls = file.name.toLowerCase().endsWith(".xls");
    if (!((isZip && isXlsx) || (isOle2 && isXls))) {
      return NextResponse.json(
        { error: "Arquivo corrompido ou formato não suportado" },
        { status: 400 },
      );
    }

    const outcome = await importFenabraveReport(buffer);
    return NextResponse.json(outcome);
  } catch (err) {
    return NextResponse.json(
      { error: `Erro ao processar arquivo: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
