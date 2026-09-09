import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "common" });
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t("notFoundTitle")}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">{t("notFoundDescription")}</p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
