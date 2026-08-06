/**
 * Locale constants — re-exported from the shared routing config so there is
 * a single source of truth for locale identifiers.
 */

import { routing } from "./routing";

export { routing } from "./routing";

export const locales = routing.locales;
export type Locale = (typeof routing.locales)[number];
export const defaultLocale = routing.defaultLocale;
