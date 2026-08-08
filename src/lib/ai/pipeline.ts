import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { editorial, type EditorialTranscript } from "@/lib/db/schema";
import { type ExtractedEditorial, extractEditorial, LlmError } from "./llm";
import { fetchTranscript, TranscriptError } from "./youtube";

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
      const text = await fetchTranscript(url);
      if (text) {
        transcripts.push(text);
        storedTranscripts.push({ videoUrl: url, text });
      }
    } catch (err) {
      if (err instanceof TranscriptError) errors.push(err.message);
      else errors.push((err as Error).message);
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

  return { status: "success", editorialId, content };
}
