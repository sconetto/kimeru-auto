import { Car, CircleDollarSign, Construction, Scale, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/config";
import { Link } from "@/lib/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

interface Props {
  locale: Locale;
}

export async function SiteHeader({ locale }: Props) {
  const [tNav, tBanner] = await Promise.all([
    getTranslations({ locale, namespace: "navigation" }),
    getTranslations({ locale, namespace: "banner" }),
  ]);

  const navLinks = [
    { href: "/" as const, label: tNav("home") },
    { href: "/compare" as const, label: tNav("compare") },
    { href: "/fipe" as const, label: tNav("fipe") },
    { href: "/financing" as const, label: tNav("financing") },
    { href: "/best-sellers" as const, label: tNav("bestSellers") },
    { href: "/about" as const, label: tNav("about") },
  ];

  return (
    <>
      {/* Under-construction banner */}
      <div className="flex flex-col items-center justify-center gap-0.5 bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
        <span className="flex items-center gap-1.5">
          <Construction className="h-3.5 w-3.5 shrink-0" />
          {tBanner("text")}
        </span>
        <span>{tBanner("hint")}</span>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"
          >
            <Car className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Kimeru <span className="text-blue-600 dark:text-blue-400">Auto</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <Link
              href="/compare"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">{tNav("compare")}</span>
            </Link>
            <Link
              href="/financing"
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <CircleDollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">{tNav("simulate")}</span>
            </Link>
            <Link
              href="/best-sellers"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">{tNav("sales")}</span>
            </Link>
            <LanguageSwitcher currentLocale={locale} />
          </div>
        </div>
      </header>
    </>
  );
}

export async function SiteFooter({ locale }: Props) {
  const [tNav, tFooter] = await Promise.all([
    getTranslations({ locale, namespace: "navigation" }),
    getTranslations({ locale, namespace: "footer" }),
  ]);

  return (
    <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {tFooter("rights", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-slate-900 dark:hover:text-white">
              {tNav("home")}
            </Link>
            <Link href="/compare" className="hover:text-slate-900 dark:hover:text-white">
              {tNav("compare")}
            </Link>
            <Link href="/fipe" className="hover:text-slate-900 dark:hover:text-white">
              {tNav("fipe")}
            </Link>
            <Link href="/about" className="hover:text-slate-900 dark:hover:text-white">
              {tNav("about")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
