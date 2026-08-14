"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import { deleteImage } from "@/lib/media/storage";

export async function deleteMediaAsset(formData: FormData) {
  const adminId = await requireRole("admin");
  if (adminId === null) return;

  const id = Number(formData.get("id"));
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!asset) return;

  await deleteImage(asset.url);

  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  await logAudit({
    adminId,
    action: "delete",
    entityType: "media_asset",
    entityId: id,
    details: { url: asset.url },
  });
  revalidatePath("/admin/media");
  revalidatePath("/", "layout");
}
