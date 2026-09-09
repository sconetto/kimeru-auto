/**
 * Source text extraction for the car-data pipeline.
 *
 * The DeepSeek model is text-only, so the app is responsible for turning a
 * source URL (PDF, website, or video) into plain text before extraction.
 */

import { extractText, getDocumentProxy } from "unpdf";
import { fetchTranscript } from "./youtube";

export type SourceKind = "pdf" | "website" | "video";

export class SourceError extends Error {
  constructor(
    message: string,
    public readonly code: "UNSUPPORTED" | "FETCH_FAILED" | "EXTRACT_FAILED",
  ) {
    super(message);
    this.name = "SourceError";
  }
}

/** Classify a URL into a source kind. */
export function detectSourceKind(url: string): SourceKind {
  const lower = url.toLowerCase();
  if (lower.endsWith(".pdf") || lower.includes(".pdf?")) return "pdf";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "video";
  return "website";
}

/** Fetch a URL and return its bytes. */
async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new SourceError(`Falha ao buscar a fonte (${res.status})`, "FETCH_FAILED");
  return new Uint8Array(await res.arrayBuffer());
}

/** Fetch a URL and return its body as text. */
async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new SourceError(`Falha ao buscar a fonte (${res.status})`, "FETCH_FAILED");
  return await res.text();
}

/** Extract text from a PDF URL. */
export async function extractPdfText(url: string): Promise<string> {
  try {
    const bytes = await fetchBytes(url);
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const joined = Array.isArray(text) ? text.join("\n") : text;
    if (!joined.trim()) throw new SourceError("PDF sem texto extraível", "EXTRACT_FAILED");
    return joined;
  } catch (err) {
    if (err instanceof SourceError) throw err;
    throw new SourceError("Não foi possível extrair o texto do PDF", "EXTRACT_FAILED");
  }
}

/** Extract plain text from a website URL (fetch HTML, strip tags). */
export async function extractWebpageText(url: string): Promise<string> {
  try {
    const html = await fetchText(url);
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) throw new SourceError("Página sem texto extraível", "EXTRACT_FAILED");
    return text;
  } catch (err) {
    if (err instanceof SourceError) throw err;
    throw new SourceError("Não foi possível extrair o texto da página", "EXTRACT_FAILED");
  }
}

/** Extract text from any supported source URL. */
export async function extractSourceText(url: string): Promise<string> {
  const kind = detectSourceKind(url);
  switch (kind) {
    case "pdf":
      return extractPdfText(url);
    case "video":
      return fetchTranscript(url);
    case "website":
      return extractWebpageText(url);
    default:
      throw new SourceError("Tipo de fonte não suportado", "UNSUPPORTED");
  }
}
