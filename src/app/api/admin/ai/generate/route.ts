import { NextResponse } from "next/server";
import { z } from "zod";
import { generateEditorial } from "@/lib/ai/pipeline";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  modelYearId: z.number().int().positive(),
  locale: z.enum(["pt-BR", "en-US"]),
  videoUrls: z.array(z.string().url()).min(1).max(5),
});

/** POST /api/admin/ai/generate — trigger AI editorial generation. */
export async function POST(request: Request) {
  const guard = await requireAdmin({ minRole: "editor" });
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const outcome = await generateEditorial(
    parsed.data.modelYearId,
    parsed.data.locale,
    parsed.data.videoUrls,
  );

  if (outcome.status === "success") {
    return NextResponse.json(outcome);
  }
  return NextResponse.json(outcome, { status: 422 });
}
