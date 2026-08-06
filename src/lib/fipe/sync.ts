import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, models, modelYears } from "@/lib/db/schema";
import { type FipeVehicleType, fipeClient } from "./client";
import { updateModelYearPrice } from "./history";
import { warmFipePrice } from "./service";

/**
 * Monthly FIPE sync job.
 *
 * Brands/models are admin-curated (the catalog is the source of truth for
 * names); FIPE is the price authority. For each local model year we:
 *
 *  1. Match the local brand to a FIPE brand by normalized name.
 *  2. Find candidate FIPE models by name prefix match.
 *  3. Among candidates, prefer the one whose year list contains the
 *     local year (versions diverge — "Corolla XLi" vs "Corolla Altis").
 *  4. Warm the price into cache and snapshot history.
 *
 * Run via cron: `npm run fipe:sync` (see .github/workflows/fipe-sync.yml).
 */

const VEHICLE_TYPE: FipeVehicleType = "cars";
const CONCURRENCY = 3;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function modelMatchesFipe(localName: string, fipeName: string): boolean {
  const local = normalize(localName);
  const fipe = normalize(fipeName);
  return local.length >= 3 && fipe.includes(local);
}

/** Run async work with bounded concurrency. */
async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  limit = CONCURRENCY,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

export interface SyncResult {
  brandsMatched: number;
  modelsMatched: number;
  yearsWarmed: number;
  errors: string[];
}

export async function syncFipeReferenceData(): Promise<SyncResult> {
  const result: SyncResult = { brandsMatched: 0, modelsMatched: 0, yearsWarmed: 0, errors: [] };

  const fipeBrands = await fipeClient.getBrands(VEHICLE_TYPE);
  const localBrands = await db.select().from(brands).where(eq(brands.isActive, true));

  const brandResults = await mapWithConcurrency(localBrands, async (localBrand) => {
    const brandStats = { matched: 0, yearsWarmed: 0, errors: [] as string[] };
    const fipeBrand = fipeBrands.find((b) => normalize(b.name) === normalize(localBrand.name));
    if (!fipeBrand) return brandStats;
    brandStats.matched = 1;

    const fipeModels = await fipeClient.getModels(Number(fipeBrand.code), VEHICLE_TYPE);
    const localModels = await db
      .select()
      .from(models)
      .where(and(eq(models.brandId, localBrand.id), eq(models.isActive, true)));

    const modelResults = await mapWithConcurrency(localModels, async (localModel) => {
      const modelStats = { yearsWarmed: 0, errors: [] as string[] };
      const candidates = fipeModels.filter((m) => modelMatchesFipe(localModel.name, m.name));
      if (candidates.length === 0) return modelStats;

      const localYears = await db
        .select()
        .from(modelYears)
        .where(eq(modelYears.modelId, localModel.id));

      // For each local year, find the FIPE candidate whose years contain it.
      const yearResults = await mapWithConcurrency(localYears, async (localYear) => {
        const expectedYear = localYear.isZeroKm ? "32000" : String(localYear.year);

        for (const candidate of candidates) {
          let candidateYears: Awaited<ReturnType<typeof fipeClient.getYears>>;
          try {
            candidateYears = await fipeClient.getYears(
              Number(fipeBrand.code),
              Number(candidate.code),
              VEHICLE_TYPE,
            );
          } catch {
            continue;
          }
          const fipeYear = candidateYears.find((y) => y.code.startsWith(`${expectedYear}-`));
          if (!fipeYear) continue;

          try {
            const warmed = await warmFipePrice(
              Number(fipeBrand.code),
              Number(candidate.code),
              fipeYear.code,
            );
            if (warmed) {
              await updateModelYearPrice(localYear.id, warmed.price, warmed.referenceMonth);
              if (localYear.fipeCode !== warmed.fipeCode) {
                await db
                  .update(modelYears)
                  .set({ fipeCode: warmed.fipeCode })
                  .where(eq(modelYears.id, localYear.id));
              }
              return 1;
            }
          } catch (err) {
            modelStats.errors.push(`warm:${localModel.name}:${(err as Error).message}`);
          }
        }
        return 0;
      });

      modelStats.yearsWarmed = yearResults.reduce<number>((a, b) => a + (b as number), 0);
      return modelStats;
    });

    brandStats.yearsWarmed = modelResults.reduce((a, m) => a + m.yearsWarmed, 0);
    brandStats.errors = modelResults.flatMap((m) => m.errors);
    return brandStats;
  });

  result.brandsMatched = brandResults.filter((b) => b.matched > 0).length;
  result.yearsWarmed = brandResults.reduce((a, b) => a + b.yearsWarmed, 0);
  result.errors = brandResults.flatMap((b) => b.errors);

  return result;
}

/** CLI entrypoint — `npm run fipe:sync`. */
if (import.meta.url === `file://${process.argv[1]}`) {
  syncFipeReferenceData()
    .then((r) => {
      console.log("FIPE sync complete:", JSON.stringify(r, null, 2));
      if (r.errors.length > 0) console.error("Errors:", r.errors);
      process.exit(r.errors.length > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("FIPE sync failed:", err);
      process.exit(1);
    });
}
