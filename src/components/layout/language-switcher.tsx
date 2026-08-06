"use client";

import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { type Locale, locales } from "@/lib/i18n/config";
import { usePathname } from "@/lib/i18n/navigation";

interface Props {
  currentLocale: Locale;
}

export function LanguageSwitcher({ currentLocale }: Props) {
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <div className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 dark:border-slate-700">
      <Globe className="h-3.5 w-3.5 text-slate-400" />
      {locales.map((locale) => {
        const isActive = locale === currentLocale;
        const href = `/${locale}${pathname || "/"}`;
        return (
          <a
            key={locale}
            href={href}
            className={`rounded px-1.5 py-0.5 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
            aria-label={locale === "pt-BR" ? t("portuguese") : t("english")}
          >
            {locale === "pt-BR" ? "PT" : "EN"}
          </a>
        );
      })}
    </div>
  );
}
