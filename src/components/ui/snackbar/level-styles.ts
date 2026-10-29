import { AlertTriangle, CheckCircle2, Info, type LucideIcon, XCircle } from "lucide-react";
import type { SnackbarLevel } from "@/lib/snackbar/types";

export interface LevelStyle {
  Icon: LucideIcon;
  /** Card colors, readable on both the light public shell and dark admin. */
  containerClassName: string;
  iconClassName: string;
}

/**
 * Single source of truth for level presentation. Components never compose a
 * level's color or icon themselves, so the mapping cannot drift between the
 * public and admin trees.
 */
export const LEVEL_STYLES: Record<SnackbarLevel, LevelStyle> = {
  error: {
    Icon: XCircle,
    containerClassName:
      "border-red-500/40 bg-red-50 text-red-900 dark:bg-red-950/80 dark:text-red-100",
    iconClassName: "text-red-500 dark:text-red-400",
  },
  warning: {
    Icon: AlertTriangle,
    containerClassName:
      "border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-100",
    iconClassName: "text-amber-500 dark:text-amber-400",
  },
  success: {
    Icon: CheckCircle2,
    containerClassName:
      "border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100",
    iconClassName: "text-emerald-500 dark:text-emerald-400",
  },
  info: {
    Icon: Info,
    containerClassName:
      "border-blue-500/40 bg-blue-50 text-blue-900 dark:bg-blue-950/80 dark:text-blue-100",
    iconClassName: "text-blue-500 dark:text-blue-400",
  },
};
