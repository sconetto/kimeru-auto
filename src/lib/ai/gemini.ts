import { LlmError } from "./llm";

/**
 * Gemini video → markdown extraction.
 *
 * Gemini watches a public YouTube URL directly (fetched via Google's own
 * infrastructure, avoiding the datacenter-IP blocks on the transcript
 * endpoints) and returns a markdown summary of the reviewer's take.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const REVIEW_PROMPT =
  "Assista a este vídeo de review de carro e produza um resumo detalhado em Markdown, em português brasileiro, do que o avaliador disse: pontos fortes, pontos fracos, desempenho, conforto, tecnologia, design, consumo, segurança e veredito final. Use títulos e listas em Markdown. Seja objetivo e baseado apenas no que foi dito no vídeo.";

async function describeVideo(youtubeUrl: string, prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new LlmError("GEMINI_API_KEY não configurada", "NO_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { fileData: { fileUri: youtubeUrl, mimeType: "video/mp4" } },
              ],
            },
          ],
        }),
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new LlmError(
        `Erro na API Gemini (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
        "API_ERROR",
      );
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const markdown = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("\n")
      .trim();

    if (!markdown) {
      throw new LlmError("Resposta vazia do Gemini", "PARSE_ERROR");
    }

    return markdown;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new LlmError("Tempo esgotado na chamada Gemini", "TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function videoToReviewMarkdown(youtubeUrl: string): Promise<string> {
  return describeVideo(youtubeUrl, REVIEW_PROMPT);
}
