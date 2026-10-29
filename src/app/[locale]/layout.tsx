import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { SiteFooter, SiteHeader } from "@/components/layout/site-header";
import { SnackbarProvider } from "@/components/ui/snackbar/snackbar-provider";
import { type Locale, locales } from "@/lib/i18n/config";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const metaByLocale: Record<Locale, Metadata> = {
  "pt-BR": {
    title: {
      default: "Kimeru Auto: Compare e decida seu próximo carro",
      template: "%s | Kimeru Auto",
    },
    description:
      "Compare carros do mercado brasileiro: especificações técnicas, preços FIPE, financiamento com CET e dados de vendas FENABRAVE.",
  },
  "en-US": {
    title: {
      default: "Kimeru Auto: Compare and decide your next car",
      template: "%s | Kimeru Auto",
    },
    description:
      "Compare Brazilian market cars: technical specifications, FIPE prices, financing with CET and FENABRAVE sales data.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const validLocale: Locale = locales.includes(locale as Locale) ? (locale as Locale) : "pt-BR";
  return metaByLocale[validLocale];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const validLocale: Locale = locales.includes(locale as Locale) ? (locale as Locale) : "pt-BR";
  const messages = await getMessages();
  const t = await getTranslations({ locale: validLocale, namespace: "snackbar" });

  return (
    <NextIntlClientProvider locale={validLocale} messages={messages}>
      <SnackbarProvider dismissLabel={t("dismiss")}>
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
          <SiteHeader locale={validLocale} />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={validLocale} />
        </div>
      </SnackbarProvider>
    </NextIntlClientProvider>
  );
}
