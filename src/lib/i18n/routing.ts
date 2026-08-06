import { defineRouting } from "next-intl/routing";

/**
 * Shared next-intl routing configuration — single source of truth used by
 * the proxy (middleware), request config, and navigation helpers.
 *
 * All public route paths are English (e.g. /compare, /financing). The
 * locale prefix distinguishes versions: /pt-BR/compare renders PT-BR UI,
 * /en-US/compare renders EN-US UI. Legacy Portuguese paths (e.g.
 * /pt-BR/comparar) 301-redirect to their English equivalents via
 * next.config redirects.
 */
export const routing = defineRouting({
  locales: ["pt-BR", "en-US"],
  defaultLocale: "pt-BR",
  localePrefix: "always",
});
