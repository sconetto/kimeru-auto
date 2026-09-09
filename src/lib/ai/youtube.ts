import {
  fetchTranscript as fetchYtTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";

export class TranscriptError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_VIDEO" | "NO_CAPTIONS" | "FETCH_FAILED",
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

function toText(segments: { text: string }[]): string {
  return segments
    .map((s) => s.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const consentFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Cookie")) {
    headers.set("Cookie", "SOCS=CAI; CONSENT=YES+cb.20210328-17-p0.en+FX+419");
  }
  if (!headers.has("User-Agent")) {
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
  }
  return fetch(input, { ...init, headers });
};

async function fetchBestText(videoId: string): Promise<string> {
  try {
    const segments = await fetchYtTranscript(videoId, { lang: "pt", fetch: consentFetch });
    return toText(segments);
  } catch (err) {
    if (err instanceof YoutubeTranscriptNotAvailableLanguageError) {
      const segments = await fetchYtTranscript(videoId, { fetch: consentFetch });
      return toText(segments);
    }
    throw err;
  }
}

export async function fetchTranscript(url: string): Promise<string> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new TranscriptError("URL do YouTube inválida", "NO_VIDEO");

  try {
    const text = await fetchBestText(videoId);
    if (!text) throw new TranscriptError("Vídeo sem transcrição disponível", "NO_CAPTIONS");
    return text;
  } catch (err) {
    const name = err instanceof Error ? err.constructor.name : "unknown";
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[youtube-transcript] ${name}: ${msg}`);
    if (err instanceof TranscriptError) throw err;
    if (
      err instanceof YoutubeTranscriptDisabledError ||
      err instanceof YoutubeTranscriptNotAvailableError
    ) {
      throw new TranscriptError("Vídeo sem transcrição disponível", "NO_CAPTIONS");
    }
    if (err instanceof YoutubeTranscriptVideoUnavailableError) {
      throw new TranscriptError("Vídeo indisponível", "NO_VIDEO");
    }
    if (err instanceof YoutubeTranscriptTooManyRequestError) {
      throw new TranscriptError("Muitas requisições ao YouTube", "FETCH_FAILED");
    }
    throw new TranscriptError("Falha ao buscar a transcrição", "FETCH_FAILED");
  }
}
