import { LlmError } from "./llm";

/**
 * Gemini video-to-markdown extraction.
 *
 * For video sources, Gemini watches the video directly (it fetches public
 * YouTube URLs using Google's own infrastructure, avoiding the datacenter-IP
 * blocks that hit the transcript endpoints) and returns a markdown spec sheet
 * that the DeepSeek extractor then parses into car data.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const VIDEO_PROMPT =
  "Assista a este vídeo de review de carro e produza uma ficha técnica completa em Markdown, em português brasileiro, com todos os dados do veículo que conseguir identificar: marca, modelo, ano, combustível, preço, categoria, porte, motor, potência, torque, cilindrada, câmbio, tração, peso, dimensões, porta-malas, tanque ou bateria, autonomia (se elétrico), consumo (cidade/estrada), suspensão, freios, garantia e itens de série (segurança, conforto, tecnologia). Use títulos e listas em Markdown. Seja objetivo e baseado apenas no que foi dito ou mostrado no vídeo.";

export async function videoToMarkdown(youtubeUrl: string): Promise<string> {
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
                { text: VIDEO_PROMPT },
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
