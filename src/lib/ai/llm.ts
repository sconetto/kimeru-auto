/**
 * LLM integration for the AI content pipeline.
 *
 * Extracts structured editorial content (pros, cons, summary, rating)
 * from YouTube review transcripts using OpenAI-compatible chat completions.
 * Supports OPENAI_API_KEY or ANTHROPIC_API_KEY (OpenAI-compatible mode).
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL ?? "gpt-4o-mini";

export interface ExtractedEditorial {
  pros: string[];
  cons: string[];
  summary: string;
  rating: number;
}

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_KEY" | "TIMEOUT" | "API_ERROR" | "PARSE_ERROR",
  ) {
    super(message);
    this.name = "LlmError";
  }
}

const SYSTEM_PROMPT = `Você é um especialista automotivo brasileiro. Analise transcrições de reviews de carros e extraia conteúdo editorial estruturado.

Regras:
- Use terminologia automotiva brasileira correta (hatch, sedã, SUV, porta-malas, entre-eixos, consumo urbano/rodoviário, etc.)
- Máximo 5 pontos fortes e 5 pontos fracos, cada um com no máximo 15 palavras
- O resumo deve ter 100-150 palavras
- A nota deve ser de 1.0 a 5.0 (uma casa decimal)
- Seja objetivo e baseado APENAS no que foi dito no vídeo
- Responda exclusivamente com JSON válido no formato:
  {"pros": ["..."], "cons": ["..."], "summary": "...", "rating": 4.5}`;

function buildUserPrompt(transcripts: string[]): string {
  return `Transcrições de reviews:\n\n${transcripts.map((t, i) => `--- Review ${i + 1} ---\n${t}`).join("\n\n")}`;
}

async function callOpenAI(transcripts: string[]): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new LlmError("OPENAI_API_KEY não configurada", "NO_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(transcripts) },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new LlmError(`Erro na API LLM (${res.status})`, "API_ERROR");
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content ?? "";
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new LlmError("Tempo esgotado na chamada LLM", "TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function callAnthropic(transcripts: string[]): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new LlmError("ANTHROPIC_API_KEY não configurada", "NO_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(transcripts) }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new LlmError(`Erro na API LLM (${res.status})`, "API_ERROR");
    }

    const data = (await res.json()) as {
      content: { type: string; text: string }[];
    };
    return data.content.find((c) => c.type === "text")?.text ?? "";
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new LlmError("Tempo esgotado na chamada LLM", "TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/** Extract structured editorial content from review transcripts. */
export async function extractEditorial(transcripts: string[]): Promise<ExtractedEditorial> {
  const raw = ANTHROPIC_API_KEY ? await callAnthropic(transcripts) : await callOpenAI(transcripts);

  try {
    const parsed = JSON.parse(raw) as Partial<ExtractedEditorial>;
    const pros = Array.isArray(parsed.pros) ? parsed.pros.slice(0, 5) : [];
    const cons = Array.isArray(parsed.cons) ? parsed.cons.slice(0, 5) : [];
    const summary = typeof parsed.summary === "string" ? parsed.summary : "";
    const rating = typeof parsed.rating === "number" ? parsed.rating : 0;

    if (!summary && pros.length === 0) {
      throw new LlmError("Resposta LLM sem conteúdo utilizável", "PARSE_ERROR");
    }

    return { pros, cons, summary, rating };
  } catch (err) {
    if (err instanceof LlmError) throw err;
    throw new LlmError("Não foi possível interpretar a resposta do LLM", "PARSE_ERROR");
  }
}
