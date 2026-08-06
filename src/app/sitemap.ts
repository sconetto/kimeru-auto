import { eq } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { brands, models } from "@/lib/db/schema";
import { locales } from "@/lib/i18n/config";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kimeruauto.com.br";

/** Static public routes per locale (English canonical paths). */
const staticRoutes = ["", "/compare", "/fipe", "/financing", "/best-sellers", "/about"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activeBrands = await db
    .select()
    .from(brands)
    .where(eq(brands.isActive, true))
    .catch(() => []);
  const activeModels = await db
    .select()
    .from(models)
    .where(eq(models.isActive, true))
    .catch(() => []);

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of staticRoutes) {
      entries.push({
        url: `${BASE_URL}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "daily" : "weekly",
        priority: route === "" ? 1 : 0.8,
      });
    }

    for (const brand of activeBrands) {
      entries.push({
        url: `${BASE_URL}/${locale}/brands/${brand.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    for (const model of activeModels) {
      entries.push({
        url: `${BASE_URL}/${locale}/car/${model.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
