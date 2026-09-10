import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { models, modelVersions } from "@/lib/db/schema";
import { slugify } from "./slug";

/**
 * Resolve the id of a model's version, creating one when none exists yet.
 * When a `name` is given, an existing version with a matching slug is reused
 * (or created); otherwise the first version is returned, falling back to a
 * singleton named after the model. Write paths that create a model year use
 * this so the version→year hierarchy stays intact even when the caller only
 * knows the family.
 */
export async function resolveOrCreateVersion(modelId: number, name?: string): Promise<number> {
  if (name?.trim()) {
    const slug = slugify(name);
    const [existing] = await db
      .select({ id: modelVersions.id })
      .from(modelVersions)
      .where(eq(modelVersions.slug, slug))
      .limit(1);
    if (existing) return existing.id;
    const [created] = await db
      .insert(modelVersions)
      .values({ modelId, name: name.trim(), slug })
      .returning({ id: modelVersions.id });
    return created.id;
  }

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
