import type { ReactNode } from "react";
import { SnackbarProvider } from "@/components/ui/snackbar/snackbar-provider";

/**
 * Admin-wide wrapper. Auth is enforced in the `(panel)` layout, so this only
 * provides the snackbar queue (static PT label, matching the admin's copy).
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <SnackbarProvider dismissLabel="Fechar">{children}</SnackbarProvider>;
}
