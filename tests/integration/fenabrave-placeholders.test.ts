import { describe, expect, it } from "vitest";

/**
 * These tests write to a real database, so they only run when explicitly
 * enabled (`RUN_DB_TESTS=1` plus a DATABASE_URL). CI's unit job has no
 * database, so the app modules are imported lazily inside the suite — a
 * top-level import would throw while merely loading this file.
 */

const RUN = process.env.RUN_DB_TESTS === "1";

async function load() {
  const [{ db }, schema, { importFenabraveRows }, { createPlaceholderResolver }, drizzle] =
    await Promise.all([
      import("@/lib/db"),
      import("@/lib/db/schema"),
      import("@/lib/fenabrave/importer"),
      import("@/lib/fenabrave/placeholder"),
      import("drizzle-orm"),
    ]);

  return {
    db,
    schema,
    importFenabraveRows,
    createPlaceholderResolver,
    eq: drizzle.eq,
    inArray: drizzle.inArray,
  };
}

const STAMP = Date.now();
const BRAND_TOKEN = `TESTBRAND${STAMP}`;
const BRAND_SLUG = `testbrand${STAMP}`;
const RAW_NAME = `${BRAND_TOKEN}/CARRO ${STAMP}`;

describe.skipIf(!RUN)("FENABRAVE placeholders (database)", () => {
  it("creates a placeholder once and reuses it for the same report name", async () => {
    const { db, schema, createPlaceholderResolver, eq } = await load();
    const resolver = createPlaceholderResolver();

    const first = await resolver.resolve(RAW_NAME);
    expect(first).not.toBeNull();
    expect(first?.created).toBe(true);

    const second = await resolver.resolve(RAW_NAME);
    expect(second?.created).toBe(false);
    expect(second?.modelId).toBe(first?.modelId);

    const [model] = await db
      .select({ isActive: schema.models.isActive, needsEnrichment: schema.models.needsEnrichment })
      .from(schema.models)
      .where(eq(schema.models.id, first?.modelId as number))
      .limit(1);

    expect(model.isActive).toBe(false);
    expect(model.needsEnrichment).toBe(true);
  });

  it("records registrations for an unmatched row and reports coverage", async () => {
    const { importFenabraveRows } = await load();

    const outcome = await importFenabraveRows(
      [{ position: 1, rawName: `${BRAND_TOKEN}/MODELO ${STAMP}`, units: 4321 }],
      12,
      2026,
    );

    expect(outcome.coverage).toEqual({ total: 1, matched: 0, created: 1, unmatched: 0 });
    expect(outcome.imported).toBe(1);
  });

  it("drops unmatched rows only when placeholder creation is disabled", async () => {
    const { importFenabraveRows } = await load();
    const previous = process.env.FENABRAVE_CREATE_PLACEHOLDERS;
    process.env.FENABRAVE_CREATE_PLACEHOLDERS = "false";

    try {
      const outcome = await importFenabraveRows(
        [{ position: 1, rawName: `${BRAND_TOKEN}/IGNORADO ${STAMP}`, units: 10 }],
        12,
        2026,
      );
      expect(outcome.coverage).toEqual({ total: 1, matched: 0, created: 0, unmatched: 1 });
    } finally {
      if (previous === undefined) delete process.env.FENABRAVE_CREATE_PLACEHOLDERS;
      else process.env.FENABRAVE_CREATE_PLACEHOLDERS = previous;
    }
  });

  it("cleans up the rows it created", async () => {
    const { db, schema, eq, inArray } = await load();

    const [brand] = await db
      .select({ id: schema.brands.id })
      .from(schema.brands)
      .where(eq(schema.brands.slug, BRAND_SLUG))
      .limit(1);

    if (!brand) return;

    const created = await db
      .select({ id: schema.models.id })
      .from(schema.models)
      .where(eq(schema.models.brandId, brand.id));
    const ids = created.map((row) => row.id);

    if (ids.length > 0) {
      await db.delete(schema.salesRankings).where(inArray(schema.salesRankings.modelId, ids));
      await db.delete(schema.models).where(inArray(schema.models.id, ids));
    }
    await db.delete(schema.brands).where(eq(schema.brands.id, brand.id));
  });
});
