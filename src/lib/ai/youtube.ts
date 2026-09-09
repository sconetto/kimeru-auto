/**
 * YouTube transcript fetching.
 *
 * Uses the YouTube Data API v3 to resolve a video ID from a URL and fetch
 * its captions. Requires YOUTUBE_API_KEY. Falls back gracefully with a
 * typed error when captions are unavailable.
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const VIDEOS_BASE = "https://www.googleapis.com/youtube/v3/videos";

export class TranscriptError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_KEY" | "NO_VIDEO" | "NO_CAPTIONS" | "FETCH_FAILED",
  ) {
    super(message);
    this.name = "TranscriptError";
  }
}

/** Extract a YouTube video ID from common URL formats. */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new TranscriptError(`Falha ao acessar YouTube (${res.status})`, "FETCH_FAILED");
  }
  return (await res.json()) as T;
}

async function fetchTitle(videoId: string): Promise<string> {
  const info = await fetchJson<{ items: { snippet?: { title?: string } }[] }>(
    `${VIDEOS_BASE}?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`,
  );
  return info.items[0]?.snippet?.title ?? "";
}

async function fetchTimedText(videoId: string, lang?: string): Promise<string | null> {
  const langParam = lang ? `&lang=${lang}` : "";
  const res = await fetch(
    `https://www.youtube.com/api/timedtext?v=${videoId}${langParam}&fmt=json3`,
  );
  if (!res.ok) return null;
  try {
    const tt = (await res.json()) as { events?: { segs?: { utf8?: string }[] }[] };
    const text = (tt.events ?? [])
      .flatMap((e) => e.segs?.map((s) => s.utf8 ?? "") ?? [])
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function fetchTranscript(url: string): Promise<string> {
  if (!YOUTUBE_API_KEY) {
    throw new TranscriptError("YOUTUBE_API_KEY não configurada", "NO_KEY");
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new TranscriptError("URL do YouTube inválida", "NO_VIDEO");
  }

  const title = await fetchTitle(videoId).catch(() => "");
  const text = (await fetchTimedText(videoId, "pt")) ?? (await fetchTimedText(videoId));

  if (!text) {
    throw new TranscriptError("Vídeo sem transcrição disponível", "NO_CAPTIONS");
  }

  return title ? `${title}\n\n${text}` : text;
}
