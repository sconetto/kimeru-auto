import { getLocale, getTranslations } from "next-intl/server";

export default async function Loading() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "common" });
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-label={t("loading")}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
    </div>
  );
}
