"use client";

import { type ReactNode, useCallback, useMemo, useReducer } from "react";
import { SnackbarContext, type SnackbarContextValue } from "@/lib/snackbar/context";
import type {
  SnackbarItem as SnackbarItemData,
  SnackbarLevel,
  SnackbarOptions,
} from "@/lib/snackbar/types";
import { SnackbarViewport } from "./snackbar-viewport";

export { LEVEL_STYLES } from "./level-styles";

/** Errors and warnings get longer on screen than confirmations. */
const DEFAULT_DURATION_MS: Record<SnackbarLevel, number> = {
  error: 6000,
  warning: 6000,
  success: 4000,
  info: 4000,
};

/** Beyond this the stack becomes a wall of toasts; the oldest is dropped. */
const MAX_VISIBLE = 3;

let sequence = 0;

type SnackbarReducerAction =
  | { type: "push"; item: SnackbarItemData }
  | { type: "dismiss"; id: string };

function reducer(state: SnackbarItemData[], action: SnackbarReducerAction): SnackbarItemData[] {
  switch (action.type) {
    case "push": {
      const next = [...state, action.item];
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    }
    case "dismiss":
      return state.filter((entry) => entry.id !== action.id);
    default:
      return state;
  }
}

interface SnackbarProviderProps {
  children: ReactNode;
  /** Localized accessible label for the per-notification dismiss control. */
  dismissLabel?: string;
}

export function SnackbarProvider({ children, dismissLabel = "Dismiss" }: SnackbarProviderProps) {
  const [items, dispatch] = useReducer(reducer, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "dismiss", id });
  }, []);

  const push = useCallback((level: SnackbarLevel, message: string, options?: SnackbarOptions) => {
    dispatch({
      type: "push",
      item: {
        id: `snackbar-${++sequence}`,
        level,
        message,
        durationMs: options?.durationMs ?? DEFAULT_DURATION_MS[level],
        createdAt: Date.now(),
        action: options?.action,
      },
    });
  }, []);

  const value = useMemo<SnackbarContextValue>(
    () => ({
      push,
      dismiss,
      error: (message, options) => push("error", message, options),
      warning: (message, options) => push("warning", message, options),
      success: (message, options) => push("success", message, options),
      info: (message, options) => push("info", message, options),
    }),
    [push, dismiss],
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <SnackbarViewport items={items} onDismiss={dismiss} dismissLabel={dismissLabel} />
    </SnackbarContext.Provider>
  );
}
