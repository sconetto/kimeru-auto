import { LlmError } from "./llm";

/**
 * DeepSeek-powered car-data extraction.
 *
 * Takes source text (from a PDF, website, or video transcript) and returns a
 * structured car-data JSON that mirrors the catalog schema (brand, model,
 * year, fuel type, price, category, size category, and spec values).
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

export interface ParsedCarSpec {
  slug: string;
  value: string;
  numericValue: number | null;
}

export interface ExtractedCarData {
  brand: string;
  model: string;
  year: number | null;
  fuelType: string;
  isZeroKm: boolean;
  priceFipe: number | null;
  category: string | null;
  sizeCategory: string | null;
  specs: ParsedCarSpec[];
}

/** Valid slug spaces, queried from the DB at parse time so the prompt stays in sync. */
export interface CarParseContext {
  specSlugs: string[];
  brandNames: string[];
  fuelTypes: string[];
  categories: string[];
}

async function callDeepSeek(system: string, user: string, maxTokens: number): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new LlmError("DEEPSEEK_API_KEY não configurada", "NO_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new LlmError(`Erro na API DeepSeek (${res.status})`, "API_ERROR");
    }

    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content ?? "";
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new LlmError("Tempo esgotado na chamada DeepSeek", "TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function buildCarSystemPrompt(ctx: CarParseContext): string {
  const specs = ctx.specSlugs.join(", ");
  const brands = ctx.brandNames.join(", ");
  const fuels = ctx.fuelTypes.join(", ");
  const categories = ctx.categories.join(", ");

  return `Você é um especialista automotivo brasileiro. Extraia do texto fornecido as informações completas de um carro (modelo + versão/ano).

Regras:
- Seja objetivo e baseado APENAS no texto fornecido; não invente valores ausentes (deixe null)
- Categorias de veículo válidas: ${categories}
- Tipos de combustível válidos: ${fuels}
- Marcas conhecidas (use o nome mais próximo do texto): ${brands}
- Especificações válidas (use EXATAMENTE um destes slugs): ${specs}
- Para cada especificação, extraia "value" (texto como aparece) e "numericValue" (número, ou null)
- priceFipe em reais (número inteiro, ou null)
- Responda exclusivamente com JSON válido no formato:
{"brand":"Volkswagen","model":"T-Cross","year":2025,"fuelType":"flex","isZeroKm":true,"priceFipe":123456,"category":"suv","sizeCategory":"compacto","specs":[{"slug":"power","value":"128 cv","numericValue":128},{"slug":"engine-type","value":"1.0 TSI turbo","numericValue":null}]}`;
}

/** Parse a numeric value from a spec string like "128 cv" / "1.0" / "2.500". */
function parseNumeric(value: string): number | null {
  if (!value) return null;
  const m = value
    .replace(/\./g, "")
    .replace(",", ".")
    .match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Extract structured car data from source text using the DeepSeek model. */
export async function extractCarData(
  text: string,
  ctx: CarParseContext,
): Promise<ExtractedCarData> {
  const raw = await callDeepSeek(
    buildCarSystemPrompt(ctx),
    `Texto da fonte:\n\n${text.slice(0, 60_000)}`,
    8192,
  );

  try {
    const parsed = JSON.parse(raw) as Partial<ExtractedCarData> & { specs?: unknown };

    const validSlugs = new Set(ctx.specSlugs);
    const specs: ParsedCarSpec[] = Array.isArray(parsed.specs)
      ? (parsed.specs as { slug?: unknown; value?: unknown }[])
          .filter(
            (s): s is { slug: string; value: string } =>
              typeof s?.slug === "string" && validSlugs.has(s.slug) && typeof s.value === "string",
          )
          .map((s) => ({ slug: s.slug, value: s.value, numericValue: parseNumeric(s.value) }))
      : [];

    const result: ExtractedCarData = {
      brand: typeof parsed.brand === "string" ? parsed.brand.trim() : "",
      model: typeof parsed.model === "string" ? parsed.model.trim() : "",
      year: typeof parsed.year === "number" ? parsed.year : null,
      fuelType: typeof parsed.fuelType === "string" ? parsed.fuelType : "",
      isZeroKm: parsed.isZeroKm === true,
      priceFipe: typeof parsed.priceFipe === "number" ? parsed.priceFipe : null,
      category: typeof parsed.category === "string" ? parsed.category : null,
      sizeCategory: typeof parsed.sizeCategory === "string" ? parsed.sizeCategory : null,
      specs,
    };

    if (!result.brand || !result.model) {
      throw new LlmError("Resposta do modelo sem marca/modelo", "PARSE_ERROR");
    }

    return result;
  } catch (err) {
    if (err instanceof LlmError) throw err;
    throw new LlmError("Não foi possível interpretar a resposta do DeepSeek", "PARSE_ERROR");
  }
}
