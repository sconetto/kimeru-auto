import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import { storeImage } from "@/lib/media/storage";
import { isSameOrigin } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

function magicBytesMatch(bytes: Uint8Array, mime: string): boolean {
  // JPEG: FF D8 FF
  if (mime === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  // PNG: 89 50 4E 47
  if (mime === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  // WebP: RIFF .... WEBP
  if (mime === "image/webp") {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  // AVIF: ftyp box at offset 4
  if (mime === "image/avif") {
    return (
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
    );
  }
  return false;
}

/** POST /api/admin/media/upload — editor+ image upload to Vercel Blob. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  }

  const guard = await requireAdmin({ minRole: "editor" });
  if (!guard.ok) return guard.response;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não encontrado no upload" }, { status: 400 });
  }
  if (!(file.type in ALLOWED_MIME)) {
    return NextResponse.json(
      { error: "Formato inválido — use JPG, PNG, WebP ou AVIF" },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande — limite de 5 MB" },
      { status: 413 },
    );
  }

  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (!magicBytesMatch(buffer, file.type)) {
      return NextResponse.json(
        { error: "Arquivo corrompido ou formato não suportado" },
        { status: 400 },
      );
    }

    const { url } = await storeImage({ file, kind: "image" });

    await db.insert(mediaAssets).values({
      url,
      kind: "image",
      mime: file.type,
      size: file.size,
      uploadedBy: guard.session.id,
    });

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: `Erro ao enviar arquivo: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
