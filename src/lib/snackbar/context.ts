"use client";

import { createContext, useContext } from "react";
import type { SnackbarLevel, SnackbarOptions } from "./types";

export interface SnackbarContextValue {
  /** Raise a notification at an explicit level. */
  push: (level: SnackbarLevel, message: string, options?: SnackbarOptions) => void;
  /** Remove a notification by id. */
  dismiss: (id: string) => void;
  error: (message: string, options?: SnackbarOptions) => void;
  warning: (message: string, options?: SnackbarOptions) => void;
  success: (message: string, options?: SnackbarOptions) => void;
  info: (message: string, options?: SnackbarOptions) => void;
}

export const SnackbarContext = createContext<SnackbarContextValue | null>(null);

/**
 * Access the snackbar queue. Throws outside a `SnackbarProvider` so a missing
 * mount point fails loudly in development instead of silently swallowing
 * feedback.
 */
export function useSnackbar(): SnackbarContextValue {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
}
