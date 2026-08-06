import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation helpers. Use these instead of `next/link` and
 * `next/navigation` so hrefs are automatically prefixed with the active
 * locale and mapped through `routing.pathnames` (English canonical paths
 * render as Portuguese aliases for pt-BR and vice versa).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
