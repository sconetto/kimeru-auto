import { NextResponse } from "next/server";
import { z } from "zod";
import { parseCarSource } from "@/lib/ai/pipeline";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  url: z.string().url(),
});

/** POST /api/admin/ai/parse-car — parse a source URL into car data. */
export async function POST(request: Request) {
  const guard = await requireAdmin({ minRole: "editor" });
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  const outcome = await parseCarSource(parsed.data.url);
  if (outcome.status === "success") {
    return NextResponse.json(outcome);
  }
  return NextResponse.json(outcome, { status: 422 });
}
