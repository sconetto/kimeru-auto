/** Canonical slug generation used across the catalog and admin actions.
 * Lowercases, strips accents (NFD + combining-mark removal), replaces any run
 * of non-alphanumeric characters with a single hyphen, and trims leading and
 * trailing hyphens. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
