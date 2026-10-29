"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SnackbarItem as SnackbarItemData } from "@/lib/snackbar/types";
import { usePrefersReducedMotion } from "@/lib/snackbar/use-prefers-reduced-motion";
import { SnackbarItem } from "./snackbar-item";

interface SnackbarViewportProps {
  items: SnackbarItemData[];
  onDismiss: (id: string) => void;
  dismissLabel: string;
}

/**
 * Fixed top-right stack, portaled to `document.body` so no ancestor's
 * `overflow-hidden` or `transform` can clip or reposition it.
 */
export function SnackbarViewport({ items, onDismiss, dismissLabel }: SnackbarViewportProps) {
  const [mounted, setMounted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || items.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm"
    >
      {items.map((item) => (
        <SnackbarItem
          key={item.id}
          item={item}
          onDismiss={onDismiss}
          dismissLabel={dismissLabel}
          reducedMotion={reducedMotion}
        />
      ))}
    </div>,
    document.body,
  );
}
