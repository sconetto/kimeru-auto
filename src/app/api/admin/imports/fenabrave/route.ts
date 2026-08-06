import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importFenabraveReport } from "@/lib/fenabrave/importer";

export const dynamic = "force-dynamic";

/** POST /api/admin/imports/fenabrave — admin-only XLSX import. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

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

  try {
    const buffer = await file.arrayBuffer();
    const outcome = await importFenabraveReport(buffer);
    return NextResponse.json(outcome);
  } catch (err) {
    return NextResponse.json(
      { error: `Erro ao processar arquivo: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
