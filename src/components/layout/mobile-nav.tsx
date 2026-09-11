"use client";

import {
  Banknote,
  Calculator,
  Car,
  House,
  Info,
  type LucideIcon,
  Menu,
  Newspaper,
  Scale,
  TrendingUp,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n/config";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

interface Props {
  locale: Locale;
}

/**
 * Mobile navigation drawer (visible below `xl`).
 *
 * Hand-rolled accessible drawer matching the AddVehicleModal pattern:
 * overlay + `aside[role="dialog" aria-modal]`, Escape/overlay/close-button
 * dismissal, focus moved into the drawer on open, closed on route change.
 * Desktop (`xl+`) navigation is untouched — this button is `xl:hidden`.
 *
 * Links are defined here (client) rather than received as props because
 * lucide icon components are functions and cannot be passed from the
 * server-side SiteHeader into a Client Component.
 */
export function MobileNav({ locale }: Props) {
  const t = useTranslations("nav");
  const tNav = useTranslations("navigation");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // The drawer lives in a portal to `document.body`; only render it after
  // hydration so SSR (no `document`) never touches it. Once mounted it stays
  // mounted — open/close are pure CSS transitions.
  useEffect(() => {
    setMounted(true);
  }, []);

  const links: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/", label: tNav("home"), icon: House },
    { href: "/compare", label: tNav("compare"), icon: Scale },
    { href: "/reviews", label: tNav("reviews"), icon: Newspaper },
    { href: "/fipe", label: tNav("fipe"), icon: Banknote },
    { href: "/financing", label: tNav("financing"), icon: Calculator },
    { href: "/best-sellers", label: tNav("bestSellers"), icon: TrendingUp },
    { href: "/brands", label: tNav("brands"), icon: Car },
    { href: "/about", label: tNav("about"), icon: Info },
  ];

  const close = () => {
    setOpen(false);
    // Return focus to the hamburger so keyboard users land where they left.
    triggerRef.current?.focus();
  };

  // Close on route change (client-side navigation while the drawer is open).
  useEffect(() => {
    if (open) setOpen(false);
  }, [pathname]);

  // Escape dismissal + scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Move focus into the drawer when it opens.
  useEffect(() => {
    if (open) drawerRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("open")}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        className="rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white xl:hidden"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 xl:hidden ${open ? "" : "pointer-events-none"}`}
            aria-hidden={!open}
            inert={!open}
          >
            {/* Overlay */}
            <button
              type="button"
              onClick={close}
              aria-label={t("close")}
              tabIndex={open ? 0 : -1}
              className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
                open ? "opacity-100" : "opacity-0"
              }`}
            />
            {/* Drawer */}
            <aside
              ref={drawerRef}
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={t("title")}
              tabIndex={-1}
              className={`absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white shadow-xl outline-none transition-transform duration-300 ease-in-out dark:bg-slate-900 ${
                open ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <span className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t("title")}
                </span>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t("close")}
                  className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex-1 px-3 py-3" aria-label={t("title")}>
                <ul className="space-y-1">
                  {links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={close}
                          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="flex justify-center border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                <LanguageSwitcher currentLocale={locale} />
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
