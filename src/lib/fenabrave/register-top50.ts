import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import type { fuelType, vehicleCategory } from "@/lib/db/schema";
import { brands, models } from "@/lib/db/schema";

type FuelType = (typeof fuelType.enumValues)[number];
type Category = (typeof vehicleCategory.enumValues)[number];

interface Top50Entry {
  brandSlug: string;
  name: string;
  slug: string;
  category: Category;
  fuelType: FuelType;
}

const GEELY = {
  name: "Geely",
  slug: "geely",
  originCountry: "China",
  fipeCode: "199",
  logoUrl: "/logos/geely.png",
};

const TOP50: Top50Entry[] = [
  { brandSlug: "fiat", name: "Strada", slug: "strada", category: "pickup", fuelType: "flex" },
  { brandSlug: "volkswagen", name: "Polo", slug: "polo", category: "hatch", fuelType: "flex" },
  { brandSlug: "volkswagen", name: "Tera", slug: "tera", category: "suv", fuelType: "flex" },
  { brandSlug: "fiat", name: "Argo", slug: "argo", category: "hatch", fuelType: "flex" },
  {
    brandSlug: "byd",
    name: "Dolphin Mini",
    slug: "dolphin-mini",
    category: "hatch",
    fuelType: "electric",
  },
  { brandSlug: "chevrolet", name: "Onix", slug: "onix", category: "hatch", fuelType: "flex" },
  { brandSlug: "hyundai", name: "Creta", slug: "creta", category: "suv", fuelType: "flex" },
  { brandSlug: "volkswagen", name: "T-Cross", slug: "t-cross", category: "suv", fuelType: "flex" },
  { brandSlug: "byd", name: "Dolphin", slug: "dolphin", category: "hatch", fuelType: "electric" },
  { brandSlug: "byd", name: "Song", slug: "song", category: "suv", fuelType: "hybrid" },
  { brandSlug: "gwm", name: "Haval H6", slug: "haval-h6", category: "suv", fuelType: "hybrid" },
  { brandSlug: "geely", name: "EX2", slug: "ex2", category: "hatch", fuelType: "electric" },
  { brandSlug: "fiat", name: "Toro", slug: "toro", category: "pickup", fuelType: "flex" },
  { brandSlug: "fiat", name: "Mobi", slug: "mobi", category: "hatch", fuelType: "flex" },
  { brandSlug: "chevrolet", name: "Tracker", slug: "tracker", category: "suv", fuelType: "flex" },
  { brandSlug: "hyundai", name: "HB20", slug: "hb20", category: "hatch", fuelType: "flex" },
  {
    brandSlug: "volkswagen",
    name: "Saveiro",
    slug: "saveiro",
    category: "pickup",
    fuelType: "flex",
  },
  { brandSlug: "fiat", name: "Fastback", slug: "fastback", category: "suv", fuelType: "flex" },
  {
    brandSlug: "chevrolet",
    name: "Onix Plus",
    slug: "onix-plus",
    category: "sedan",
    fuelType: "flex",
  },
  { brandSlug: "fiat", name: "Pulse", slug: "pulse", category: "suv", fuelType: "flex" },
  { brandSlug: "jeep", name: "Compass", slug: "compass", category: "suv", fuelType: "flex" },
  { brandSlug: "renault", name: "Kwid", slug: "kwid", category: "hatch", fuelType: "flex" },
  {
    brandSlug: "toyota",
    name: "Yaris Cross",
    slug: "yaris-cross",
    category: "suv",
    fuelType: "flex",
  },
  { brandSlug: "toyota", name: "Hilux", slug: "hilux", category: "pickup", fuelType: "diesel" },
  { brandSlug: "honda", name: "WR-V", slug: "wr-v", category: "suv", fuelType: "flex" },
  {
    brandSlug: "caoa-chery",
    name: "Tiggo 5X",
    slug: "tiggo-5x",
    category: "suv",
    fuelType: "flex",
  },
  { brandSlug: "omoda", name: "Omoda 5", slug: "omoda-5", category: "suv", fuelType: "hybrid" },
  { brandSlug: "honda", name: "HR-V", slug: "hr-v", category: "suv", fuelType: "flex" },
  {
    brandSlug: "toyota",
    name: "Corolla Cross",
    slug: "corolla-cross",
    category: "suv",
    fuelType: "flex",
  },
  { brandSlug: "volkswagen", name: "Nivus", slug: "nivus", category: "suv", fuelType: "flex" },
  { brandSlug: "nissan", name: "Kait", slug: "kait", category: "suv", fuelType: "flex" },
  { brandSlug: "ford", name: "Ranger", slug: "ranger", category: "pickup", fuelType: "diesel" },
  { brandSlug: "hyundai", name: "i20", slug: "i20", category: "hatch", fuelType: "flex" },
  { brandSlug: "jeep", name: "Renegade", slug: "renegade", category: "suv", fuelType: "flex" },
  { brandSlug: "volkswagen", name: "Virtus", slug: "virtus", category: "sedan", fuelType: "flex" },
  { brandSlug: "chevrolet", name: "S10", slug: "s10", category: "pickup", fuelType: "diesel" },
  { brandSlug: "nissan", name: "Kicks", slug: "kicks", category: "suv", fuelType: "flex" },
  { brandSlug: "chevrolet", name: "Sonic", slug: "sonic", category: "suv", fuelType: "flex" },
  { brandSlug: "ram", name: "Rampage", slug: "rampage", category: "pickup", fuelType: "flex" },
  { brandSlug: "jaecoo", name: "Jaecoo 7", slug: "jaecoo-7", category: "suv", fuelType: "hybrid" },
  { brandSlug: "fiat", name: "Cronos", slug: "cronos", category: "sedan", fuelType: "flex" },
  { brandSlug: "fiat", name: "Fiorino", slug: "fiorino", category: "van", fuelType: "flex" },
  { brandSlug: "chevrolet", name: "Spin", slug: "spin", category: "mpv", fuelType: "flex" },
  {
    brandSlug: "chevrolet",
    name: "Montana",
    slug: "montana",
    category: "pickup",
    fuelType: "flex",
  },
  { brandSlug: "honda", name: "City", slug: "city", category: "sedan", fuelType: "flex" },
  {
    brandSlug: "honda",
    name: "City Hatch",
    slug: "city-hatch",
    category: "hatch",
    fuelType: "flex",
  },
  { brandSlug: "byd", name: "King", slug: "king", category: "sedan", fuelType: "hybrid_plug_in" },
  { brandSlug: "renault", name: "Kardian", slug: "kardian", category: "suv", fuelType: "flex" },
  { brandSlug: "geely", name: "EX5 EM-i", slug: "ex5-em-i", category: "suv", fuelType: "electric" },
  { brandSlug: "caoa-chery", name: "Tiggo 7", slug: "tiggo-7", category: "suv", fuelType: "flex" },
];

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED_IN_PRODUCTION !== "1") {
    throw new Error(
      "Refusing to register in production. Set ALLOW_SEED_IN_PRODUCTION=1 to override.",
    );
  }

  const existingGeely = await db.select().from(brands).where(eq(brands.slug, "geely")).limit(1);
  if (existingGeely.length === 0) {
    await db.insert(brands).values(GEELY);
    console.log("✓ Geely brand created");
  }

  let createdModels = 0;
  let missingBrands = 0;

  for (const entry of TOP50) {
    const [brand] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.slug, entry.brandSlug))
      .limit(1);
    if (!brand) {
      console.warn(`⚠ Skipping "${entry.name}": brand "${entry.brandSlug}" not found`);
      missingBrands++;
      continue;
    }

    const [existingModel] = await db
      .select({ id: models.id })
      .from(models)
      .where(eq(models.slug, entry.slug))
      .limit(1);

    if (existingModel) continue;

    await db.insert(models).values({
      brandId: brand.id,
      name: entry.name,
      slug: entry.slug,
      category: entry.category,
    });
    createdModels++;
  }

  console.log(`✓ Models (families) created: ${createdModels}`);
  if (missingBrands > 0) console.log(`⚠ Missing brands: ${missingBrands}`);
  console.log("✅ Top-50 FENABRAVE registration complete");
}

main()
  .catch((err) => {
    console.error("❌ Registration failed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
