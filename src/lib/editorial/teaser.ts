/**
 * Editorial display helpers shared by the car detail page and review page.
 */

/** Strip markdown syntax and trim to a short plain-text editorial teaser. */
export function editorialTeaser(summary: string | null, maxLength = 160): string | null {
  if (!summary) return null;
  const plain = summary
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}…`;
}

/** Extract the YouTube video ID from a URL (watch?v=, youtu.be/, shorts/, embed/). */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1] ?? null;
}
