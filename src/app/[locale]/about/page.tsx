import { Heart, Sparkles, User } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";

const KO_FI_URL = "https://ko-fi.com/sconetto";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  const creatorLinks: { href: string; label: string }[] = [
    { href: "https://github.com/sconetto", label: t("links.github") },
    { href: "https://www.linkedin.com/in/sconetto", label: t("links.linkedin") },
    { href: "https://sconetto.me", label: t("links.website") },
    { href: "https://blog.sconetto.me", label: t("links.blog") },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-300">{t("subtitle")}</p>
        <p className="mt-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
          {t("tagline")}
        </p>
      </section>

      {/* Back story */}
      <section className="mt-12">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
          <Heart className="h-5 w-5 text-red-500" />
          {t("backStory.title")}
        </h2>
        <div className="space-y-4 text-slate-600 dark:text-slate-300">
          <p>{t("backStory.p1")}</p>
          <p>{t("backStory.p2")}</p>
          <p>{t("backStory.p3")}</p>
        </div>
      </section>

      {/* Why open source */}
      <section className="mt-12">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-blue-500" />
          {t("openSource.title")}
        </h2>
        <div className="space-y-4 text-slate-600 dark:text-slate-300">
          <p>{t("openSource.p1")}</p>
          <p>{t("openSource.p2")}</p>
        </div>
      </section>

      {/* About the creator */}
      <section className="mt-12">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
          <User className="h-5 w-5 text-emerald-500" />
          {t("creator.title")}
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("creator.name")}
          </p>
          <p className="text-sm text-slate-500">{t("creator.role")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("creator.location")}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {t("creator.bio")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {creatorLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-400"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="mt-12 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-500/20 dark:bg-amber-500/5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t("support.title")}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
          {t("support.text")}
        </p>
        <a
          href={KO_FI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          {t("support.button")}
        </a>
      </section>

      <p className="mt-8 text-center text-xs text-slate-400">
        <Link href="/" className="hover:text-blue-600">
          {t("backToHome")}
        </Link>
      </p>
    </div>
  );
}
