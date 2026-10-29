/** Severity of a snackbar notification. Drives its color and icon. */
export type SnackbarLevel = "error" | "warning" | "success" | "info";

/** Optional inline action rendered on a notification (e.g. "Desfazer"). */
export interface SnackbarAction {
  label: string;
  onClick: () => void;
}

/** Options accepted by every notification helper. */
export interface SnackbarOptions {
  /** Overrides the level's default auto-dismiss duration. */
  durationMs?: number;
  action?: SnackbarAction;
}

/** A single notification currently queued for display. */
export interface SnackbarItem {
  id: string;
  level: SnackbarLevel;
  message: string;
  durationMs: number;
  createdAt: number;
  action?: SnackbarAction;
}
