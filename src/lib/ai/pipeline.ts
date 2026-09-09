import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  brands,
  type EditorialTranscript,
  editorial,
  fuelType,
  specCategories,
  vehicleCategory,
} from "@/lib/db/schema";
import { type ExtractedCarData, extractCarData } from "./car-extract";
import { videoToReviewMarkdown } from "./gemini";
import { type ExtractedEditorial, extractEditorial, LlmError } from "./llm";
import { matchBrandName } from "./match";
import { extractSourceText, SourceError } from "./source";

/**
 * AI content pipeline orchestrator.
 *
 * Admin provides YouTube review URLs → transcripts are fetched → LLM
 * extracts structured pros/cons/summary/rating/scoreBreakdown → content is
 * staged in the editorial table (aiGenerated=true, published=false) for
 * admin review. Transcripts are stored alongside the content so the source
 * material survives even if the YouTube video is removed.
 */

export type GenerateStatus = "success" | "no_transcript" | "llm_error" | "validation_error";

export interface GenerateOutcome {
  status: GenerateStatus;
  editorialId?: number;
  content?: ExtractedEditorial;
  transcripts?: EditorialTranscript[];
  error?: string;
}

export async function generateEditorial(
  modelYearId: number,
  locale: "pt-BR" | "en-US",
  videoUrls: string[],
): Promise<GenerateOutcome> {
  if (videoUrls.length === 0) {
    return { status: "validation_error", error: "Informe ao menos uma URL de vídeo" };
  }

  // 1. Fetch transcripts (tolerate per-video failures)
  const transcripts: string[] = [];
  const storedTranscripts: EditorialTranscript[] = [];
  const errors: string[] = [];
  for (const url of videoUrls) {
    try {
      const text = await videoToReviewMarkdown(url);
      if (text) {
        transcripts.push(text);
        storedTranscripts.push({ videoUrl: url, text });
      }
    } catch (err) {
      errors.push((err as Error).message);
    }
  }

  if (transcripts.length === 0) {
    return { status: "no_transcript", error: errors[0] ?? "Nenhuma transcrição disponível" };
  }

  // 2. LLM extraction
  let content: ExtractedEditorial;
  try {
    content = await extractEditorial(transcripts);
  } catch (err) {
    if (err instanceof LlmError) {
      return { status: "llm_error", error: err.message };
    }
    return { status: "llm_error", error: (err as Error).message };
  }

  // 3. Stage for review (upsert by model_year + locale)
  const existing = await db
    .select()
    .from(editorial)
    .where(and(eq(editorial.modelYearId, modelYearId), eq(editorial.locale, locale)))
    .limit(1);

  const sourceVideos = videoUrls.map((url) => ({ url }));
  let editorialId: number;

  if (existing.length > 0) {
    await db
      .update(editorial)
      .set({
        pros: content.pros,
        cons: content.cons,
        summary: content.summary,
        rating: String(content.rating),
        scoreBreakdown: content.scoreBreakdown,
        transcripts: storedTranscripts,
        sourceVideos,
        aiGenerated: true,
        published: false,
        updatedAt: new Date(),
      })
      .where(eq(editorial.id, existing[0].id));
    editorialId = existing[0].id;
  } else {
    const [inserted] = await db
      .insert(editorial)
      .values({
        modelYearId,
        locale,
        pros: content.pros,
        cons: content.cons,
        summary: content.summary,
        rating: String(content.rating),
        scoreBreakdown: content.scoreBreakdown,
        transcripts: storedTranscripts,
        sourceVideos,
        aiGenerated: true,
        published: false,
      })
      .returning();
    editorialId = inserted.id;
  }

  return { status: "success", editorialId, content, transcripts: storedTranscripts };
}

/* ------------------------------------------------------------------ */
/* Car-data ingestion                                                  */
/* ------------------------------------------------------------------ */

export type ParseStatus = "success" | "source_error" | "llm_error";

export interface ParseOutcome {
  status: ParseStatus;
  data?: ExtractedCarData;
  brandMatch?: { id: number; name: string; score: number } | null;
  /** spec category slug → id, for the create flow to map spec values. */
  specMap?: Record<string, number>;
  error?: string;
}

/**
 * Parse a source URL (PDF / website / video) into structured car data.
 *
 * The text is fetched here, then handed to DeepSeek together with the live
 * brand list, spec-category slugs, fuel types, and vehicle categories so the
 * model's output is constrained to the catalog's vocabulary.
 */
export async function parseCarSource(url: string): Promise<ParseOutcome> {
  // 1. Extract source text
  let text: string;
  try {
    text = await extractSourceText(url);
  } catch (err) {
    if (err instanceof SourceError) return { status: "source_error", error: err.message };
    return { status: "source_error", error: (err as Error).message };
  }

  // 2. Query the catalog vocabulary
  const [specRows, brandRows] = await Promise.all([
    db.select({ id: specCategories.id, slug: specCategories.slug }).from(specCategories),
    db.select({ id: brands.id, name: brands.name, slug: brands.slug }).from(brands),
  ]);
  const specMap: Record<string, number> = {};
  for (const s of specRows) specMap[s.slug] = s.id;

  // 3. Extract car data with DeepSeek
  let data: ExtractedCarData;
  try {
    data = await extractCarData(text, {
      specSlugs: specRows.map((s) => s.slug),
      brandNames: brandRows.map((b) => b.name),
      fuelTypes: [...fuelType.enumValues],
      categories: [...vehicleCategory.enumValues],
    });
  } catch (err) {
    if (err instanceof LlmError) return { status: "llm_error", error: err.message };
    return { status: "llm_error", error: (err as Error).message };
  }

  // 4. Soft-match the parsed brand
  const brandMatch = matchBrandName(data.brand, brandRows);

  return { status: "success", data, brandMatch, specMap };
}
