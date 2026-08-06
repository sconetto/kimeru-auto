/**
 * YouTube transcript fetching.
 *
 * Uses the YouTube Data API v3 to resolve a video ID from a URL and fetch
 * its captions. Requires YOUTUBE_API_KEY. Falls back gracefully with a
 * typed error when captions are unavailable.
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CAPTIONS_BASE = "https://www.googleapis.com/youtube/v3/captions";
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

interface CaptionTrack {
  id: string;
  kind: string;
  language: string;
  name?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new TranscriptError(`Falha ao acessar YouTube (${res.status})`, "FETCH_FAILED");
  }
  return (await res.json()) as T;
}

/** Fetch the auto-generated or manual caption track for a video. */
export async function fetchTranscript(url: string): Promise<string> {
  if (!YOUTUBE_API_KEY) {
    throw new TranscriptError("YOUTUBE_API_KEY não configurada", "NO_KEY");
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new TranscriptError("URL do YouTube inválida", "NO_VIDEO");
  }

  // 1. Resolve video title + check captions exist
  const videoInfo = await fetchJson<{
    items: { snippet?: { title?: string } }[];
  }>(`${VIDEOS_BASE}?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`);

  const title = videoInfo.items[0]?.snippet?.title ?? "";

  // 2. List caption tracks
  const captions = await fetchJson<{ items: CaptionTrack[] }>(
    `${CAPTIONS_BASE}?part=snippet&videoId=${videoId}&key=${YOUTUBE_API_KEY}`,
  );

  const tracks = captions.items ?? [];
  // Prefer Portuguese (pt) tracks, then any manual track, then auto-generated
  const ptTrack =
    tracks.find((t) => t.language.startsWith("pt")) ??
    tracks.find((t) => t.kind === "standard") ??
    tracks.find((t) => t.kind === "asr") ??
    tracks[0];

  if (!ptTrack) {
    throw new TranscriptError("Vídeo sem transcrição disponível", "NO_CAPTIONS");
  }

  // 3. Download the caption content (requires OAuth for download, so this
  // uses the timedtext endpoint which is public for public videos).
  const timedTextUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${ptTrack.language}&fmt=json3`;
  const ttRes = await fetch(timedTextUrl);

  if (!ttRes.ok) {
    // Fallback: try the generic download endpoint (may need API key)
    const dlRes = await fetchJson<{ items?: unknown[] }>(
      `${CAPTIONS_BASE}/${ptTrack.id}?key=${YOUTUBE_API_KEY}`,
    ).catch(() => null);
    if (!dlRes) {
      throw new TranscriptError("Não foi possível baixar a transcrição", "NO_CAPTIONS");
    }
  }

  const tt = (await ttRes.json()) as { events?: { segs?: { utf8?: string }[] }[] };
  const text = (tt.events ?? [])
    .flatMap((e) => e.segs?.map((s) => s.utf8 ?? "") ?? [])
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    throw new TranscriptError("Transcrição vazia", "NO_CAPTIONS");
  }

  // Attach the title as a leading header comment for the LLM context
  return title ? `${title}\n\n${text}` : text;
}
