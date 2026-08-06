import { NextResponse } from "next/server";
import { z } from "zod";
import { generateEditorial } from "@/lib/ai/pipeline";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  modelYearId: z.number().int().positive(),
  locale: z.enum(["pt-BR", "en-US"]),
  videoUrls: z.array(z.string().url()).min(1).max(5),
});

/** POST /api/admin/ai/generate — trigger AI editorial generation. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

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
