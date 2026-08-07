import {
  Banknote,
  Calculator,
  Car,
  Construction,
  House,
  Info,
  Scale,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/config";
import { Link } from "@/lib/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

interface Props {
  locale: Locale;
}

/** GitHub mark — lucide-react dropped brand icons, so inline the official path. */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export async function SiteHeader({ locale }: Props) {
  const [tNav, tBanner] = await Promise.all([
    getTranslations({ locale, namespace: "navigation" }),
    getTranslations({ locale, namespace: "banner" }),
  ]);

  const navLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/", label: tNav("home"), icon: House },
    { href: "/compare", label: tNav("compare"), icon: Scale },
    { href: "/fipe", label: tNav("fipe"), icon: Banknote },
    { href: "/financing", label: tNav("financing"), icon: Calculator },
    { href: "/best-sellers", label: tNav("bestSellers"), icon: TrendingUp },
    { href: "/about", label: tNav("about"), icon: Info },
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
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 justify-self-start text-lg font-bold text-slate-900 dark:text-white"
          >
            <Car className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Kimeru <span className="text-blue-600 dark:text-blue-400">Auto</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center justify-self-end gap-1">
            <LanguageSwitcher currentLocale={locale} />
          </div>
        </div>
      </header>
    </>
  );
}

export async function SiteFooter({ locale }: Props) {
  const tFooter = await getTranslations({ locale, namespace: "footer" });

  const linkGroups: {
    title: string;
    links: { href: string; label: string; external?: boolean }[];
  }[] = [
    {
      title: tFooter("groups.explore.title"),
      links: [
        { href: "/compare", label: tFooter("groups.explore.compare") },
        { href: "/fipe", label: tFooter("groups.explore.fipe") },
        { href: "/financing", label: tFooter("groups.explore.financing") },
        { href: "/best-sellers", label: tFooter("groups.explore.bestSellers") },
      ],
    },
    {
      title: tFooter("groups.resources.title"),
      links: [
        { href: "/brands", label: tFooter("groups.resources.brands") },
        { href: "/about", label: tFooter("groups.resources.about") },
      ],
    },
    {
      title: tFooter("groups.project.title"),
      links: [
        {
          href: "https://github.com/sconetto/kimeru-auto",
          label: tFooter("groups.project.github"),
          external: true,
        },
      ],
    },
  ];

  return (
    <footer className="border-t border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand blurb */}
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"
            >
              <Car className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Kimeru <span className="text-blue-600 dark:text-blue-400">Auto</span>
            </Link>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {tFooter("rights", { year: new Date().getFullYear() })}
            </p>
          </div>

          {/* Link groups */}
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.links.map((link) =>
                  link.external ? (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                      >
                        <GitHubIcon className="h-4 w-4" />
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
