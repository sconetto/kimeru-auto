import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCompareCars } from "@/lib/catalog/queries";
import { CompareClient } from "./compare-client";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "compare" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function ComparePage({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cars?: string }>;
}) {
  const { cars } = await searchParams;

  const initialIds = cars
    ? cars
        .split(",")
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => Number.isInteger(n) && n > 0)
        .slice(0, 3)
    : [];

  const initialCars = initialIds.length > 0 ? await getCompareCars(initialIds).catch(() => []) : [];

  return <CompareClient initialCars={initialCars} />;
}
