"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SnackbarItem as SnackbarItemData } from "@/lib/snackbar/types";
import { LEVEL_STYLES } from "./level-styles";

/** Must match the `snackbar-out` keyframe duration in globals.css. */
const EXIT_ANIMATION_MS = 200;

/** Reduced-motion users get longer to read a notification. */
const REDUCED_MOTION_DURATION_FACTOR = 2;

interface SnackbarItemProps {
  item: SnackbarItemData;
  onDismiss: (id: string) => void;
  dismissLabel: string;
  reducedMotion: boolean;
}

export function SnackbarItem({ item, onDismiss, dismissLabel, reducedMotion }: SnackbarItemProps) {
  const { Icon, containerClassName, iconClassName } = LEVEL_STYLES[item.level];
  const [leaving, setLeaving] = useState(false);
  const dismissedRef = useRef(false);

  const requestDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;

    if (reducedMotion) {
      onDismiss(item.id);
      return;
    }
    setLeaving(true);
    window.setTimeout(() => onDismiss(item.id), EXIT_ANIMATION_MS);
  }, [item.id, onDismiss, reducedMotion]);

  const duration = reducedMotion
    ? item.durationMs * REDUCED_MOTION_DURATION_FACTOR
    : item.durationMs;
  const remainingRef = useRef(duration);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(requestDismiss, remainingRef.current);
  }, [requestDismiss]);

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer, clearTimer]);

  function handleMouseEnter() {
    if (timerRef.current === null) return;
    clearTimer();
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
  }

  function handleMouseLeave() {
    if (dismissedRef.current || remainingRef.current <= 0) return;
    startTimer();
  }

  // Errors interrupt the screen reader; confirmations wait their turn.
  const role = item.level === "error" || item.level === "warning" ? "alert" : "status";

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover-pause is a pointer-only convenience; the notification is announced by role and dismissed by its button.
    <div
      role={role}
      data-testid="snackbar"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-3 shadow-lg ${containerClassName} ${
        leaving ? "snackbar-leave" : "snackbar-enter"
      }`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClassName}`} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm leading-snug">{item.message}</p>
      {item.action ? (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick();
            requestDismiss();
          }}
          className="shrink-0 text-sm font-semibold underline underline-offset-2"
        >
          {item.action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={requestDismiss}
        aria-label={dismissLabel}
        className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
