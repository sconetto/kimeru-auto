import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { models, modelVersions } from "@/lib/db/schema";

/**
 * Resolve the id of a model's version, creating a singleton "default" version
 * (named after the model) when none exists yet. Write paths that create a
 * model year use this so the version→year hierarchy stays intact even when the
 * caller only knows the family.
 */
export async function resolveOrCreateVersion(modelId: number): Promise<number> {
  const [existing] = await db
    .select({ id: modelVersions.id })
    .from(modelVersions)
    .where(eq(modelVersions.modelId, modelId))
    .limit(1);
  if (existing) return existing.id;

  const [model] = await db
    .select({ name: models.name, slug: models.slug })
    .from(models)
    .where(eq(models.id, modelId))
    .limit(1);

  const [created] = await db
    .insert(modelVersions)
    .values({
      modelId,
      name: model?.name ?? "Padrão",
      slug: model?.slug ?? `default-${modelId}`,
    })
    .returning({ id: modelVersions.id });
  return created.id;
}
