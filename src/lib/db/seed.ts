import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import {
  adminUsers,
  brands,
  editorial,
  fipeHistory,
  models,
  modelYears,
  salesRankings,
  specCategories,
  specValues,
} from "./schema";
import { seedBrands, seedModels, seedSpecCategories } from "./seed-data";

/**
 * Seed script — populates reference data for local development.
 *   npm run db:seed
 *
 * Idempotent: safe to re-run (upserts by slug/fipe code).
 * Only seeds PT-BR editorial and sample sales data when absent.
 */

async function main() {
  console.log("🌱 Seeding Kimeru Auto database...");

  /* 1. Spec categories (upsert by slug) */
  let createdCategories = 0;
  for (const cat of seedSpecCategories) {
    const existing = await db
      .select()
      .from(specCategories)
      .where(eq(specCategories.slug, cat.slug))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(specCategories).values(cat);
      createdCategories++;
    }
  }
  console.log(
    `  ✓ Spec categories: ${createdCategories} created, ${seedSpecCategories.length} total`,
  );

  /* 2. Brands (upsert by slug) */
  let createdBrands = 0;
  for (const brand of seedBrands) {
    const existing = await db.select().from(brands).where(eq(brands.slug, brand.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(brands).values(brand);
      createdBrands++;
    }
  }
  console.log(`  ✓ Brands: ${createdBrands} created, ${seedBrands.length} total`);

  /* 3. Models + model years + specs */
  let createdModels = 0;
  let createdYears = 0;
  let createdSpecs = 0;
  let createdHistory = 0;

  for (const model of seedModels) {
    const brand = await db.select().from(brands).where(eq(brands.slug, model.brandSlug)).limit(1);
    if (brand.length === 0) {
      console.warn(`  ⚠ Skipping "${model.name}": brand "${model.brandSlug}" not found`);
      continue;
    }

    const existingModel = await db
      .select()
      .from(models)
      .where(eq(models.slug, model.slug))
      .limit(1);
    let modelId: number;
    if (existingModel.length === 0) {
      const [inserted] = await db
        .insert(models)
        .values({
          brandId: brand[0].id,
          name: model.name,
          slug: model.slug,
          category: model.category,
          sizeCategory: model.sizeCategory,
        })
        .returning();
      modelId = inserted.id;
      createdModels++;
    } else {
      modelId = existingModel[0].id;
    }

    for (const my of model.modelYears) {
      const existingYear = await db
        .select()
        .from(modelYears)
        .where(
          and(
            eq(modelYears.modelId, modelId),
            eq(modelYears.year, my.year),
            eq(modelYears.fuelType, my.fuelType),
            eq(modelYears.isZeroKm, my.isZeroKm),
          ),
        )
        .limit(1);

      let yearId: number;
      if (existingYear.length === 0) {
        const [inserted] = await db
          .insert(modelYears)
          .values({
            modelId,
            year: my.year,
            fuelType: my.fuelType,
            fipeCode: my.fipeCode,
            isZeroKm: my.isZeroKm,
            priceFipe: my.priceFipe,
            priceUpdatedAt: new Date(),
          })
          .returning();
        yearId = inserted.id;
        createdYears++;
      } else {
        yearId = existingYear[0].id;
      }

      /* Spec values (upsert by modelYearId + categorySlug) */
      for (const spec of my.specs) {
        const category = await db
          .select()
          .from(specCategories)
          .where(eq(specCategories.slug, spec.categorySlug))
          .limit(1);
        if (category.length === 0) {
          console.warn(`  ⚠ Unknown spec category "${spec.categorySlug}" for ${model.name}`);
          continue;
        }
        const existingValue = await db
          .select()
          .from(specValues)
          .where(
            and(eq(specValues.modelYearId, yearId), eq(specValues.specCategoryId, category[0].id)),
          )
          .limit(1);
        if (existingValue.length === 0) {
          await db.insert(specValues).values({
            modelYearId: yearId,
            specCategoryId: category[0].id,
            value: spec.value,
            numericValue: spec.numericValue?.toString() ?? null,
            displayValue: spec.displayValue ?? spec.value,
          });
          createdSpecs++;
        }
      }

      /* FIPE history snapshot (skip if reference month exists) */
      const refMonth = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const existingHistory = await db
        .select()
        .from(fipeHistory)
        .where(and(eq(fipeHistory.modelYearId, yearId), eq(fipeHistory.referenceMonth, refMonth)))
        .limit(1);
      if (existingHistory.length === 0) {
        await db.insert(fipeHistory).values({
          modelYearId: yearId,
          referenceMonth: refMonth,
          price: my.priceFipe,
        });
        createdHistory++;
      }
    }
  }
  console.log(
    `  ✓ Models: ${createdModels} created · Years: ${createdYears} · Specs: ${createdSpecs} · FIPE snapshots: ${createdHistory}`,
  );

  /* 4. Sample sales rankings (current month) */
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const sampleSales = [
    { modelSlug: "hb20", units: 8432, pos: 1 },
    { modelSlug: "onix", units: 7891, pos: 2 },
    { modelSlug: "polo", units: 6234, pos: 3 },
    { modelSlug: "strada", units: 9984, pos: 1 },
  ];
  let createdSales = 0;
  for (const s of sampleSales) {
    const model = await db.select().from(models).where(eq(models.slug, s.modelSlug)).limit(1);
    if (model.length === 0) continue;
    const my = await db
      .select()
      .from(modelYears)
      .where(and(eq(modelYears.modelId, model[0].id), eq(modelYears.isZeroKm, true)))
      .limit(1);
    if (my.length === 0) continue;
    const existing = await db
      .select()
      .from(salesRankings)
      .where(
        and(
          eq(salesRankings.modelYearId, my[0].id),
          eq(salesRankings.month, month),
          eq(salesRankings.year, year),
        ),
      )
      .limit(1);
    if (existing.length === 0) {
      await db.insert(salesRankings).values({
        modelYearId: my[0].id,
        month,
        year,
        unitsSold: s.units,
        rankingPosition: s.pos,
      });
      createdSales++;
    }
  }
  console.log(`  ✓ Sales rankings: ${createdSales} created`);

  /* 5. Admin user (only if none exists) */
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@kimeru.example";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123456";
  const existingAdmin = await db.select().from(adminUsers).limit(1);
  if (existingAdmin.length === 0) {
    const passwordHash = await hash(adminPassword, 10);
    await db.insert(adminUsers).values({
      email: adminEmail,
      name: "Kimeru Admin",
      passwordHash,
      role: "admin",
    });
    console.log(`  ✓ Admin user created: ${adminEmail}`);
  } else {
    console.log("  · Admin user already exists, skipping");
  }

  /* 6. Sample editorial for HB20 (PT-BR) */
  const hb20 = await db.select().from(models).where(eq(models.slug, "hb20")).limit(1);
  if (hb20.length > 0) {
    const my = await db
      .select()
      .from(modelYears)
      .where(eq(modelYears.modelId, hb20[0].id))
      .limit(1);
    if (my.length > 0) {
      const existing = await db
        .select()
        .from(editorial)
        .where(and(eq(editorial.modelYearId, my[0].id), eq(editorial.locale, "pt-BR")))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(editorial).values({
          modelYearId: my[0].id,
          locale: "pt-BR",
          pros: ["Motor 1.0 turbo eficiente", "Bom pacote de segurança", "Conectividade completa"],
          cons: ["Porta-malas compacto", "Acabamento interno simples"],
          summary:
            "O HB20 1.0 Turbo é um dos hatches compactos mais completos do Brasil, combinando bom desempenho com consumo eficiente e um pacote generoso de equipamentos.",
          rating: "4.5",
          aiGenerated: true,
          published: true,
        });
        console.log("  ✓ Editorial PT-BR criado para HB20");
      }
    }
  }

  console.log("✅ Seed complete!");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
