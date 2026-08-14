import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";

/**
 * Image storage abstraction. Uses Vercel Blob when configured; falls back to
 * writing files under public/uploads/ in environments without a Blob token
 * (local dev, CI E2E). Mirrors the cache.ts graceful-degradation pattern.
 */

const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function storeImage(input: { file: File; kind: string }): Promise<{ url: string }> {
  const { file } = input;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (hasBlob) {
    const blob = await put(`admin/${Date.now()}-${crypto.randomUUID()}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return { url: blob.url };
  }

  const ext = path.extname(file.name) || ".img";
  const name = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, name);
  await writeFile(filePath, buffer);
  return { url: `/uploads/${name}` };
}

export async function deleteImage(url: string): Promise<void> {
  if (hasBlob) {
    try {
      await del(url);
    } catch {
      // Blob may already be gone — ignore.
    }
    return;
  }

  if (url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", url);
    await unlink(filePath).catch(() => {});
  }
}
