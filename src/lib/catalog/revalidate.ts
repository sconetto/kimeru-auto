import { updateTag } from "next/cache";

/**
 * Invalidate the Data Cache entries that feed public catalog/sales pages.
 * Call from admin Server Actions (alongside revalidatePath) and from the
 * FIPE / FENABRAVE sync jobs so cached queries reflect writes immediately.
 */
export function revalidateCatalog(): void {
  updateTag("catalog");
  updateTag("sales");
}
