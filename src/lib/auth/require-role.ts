import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type AdminRole = "admin" | "editor" | "viewer";

/**
 * Require an authenticated admin session with at least one of the given
 * roles. Redirects to the login page when unauthenticated; returns null
 * (without redirecting) when authenticated but lacking the role, so callers
 * can decide between 403 and a silent no-op. Returns the admin user id.
 */
export async function requireRole(...roles: AdminRole[]): Promise<number | null> {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
    return null;
  }
  const userRole = (session.user as { role?: string }).role ?? "viewer";
  if (roles.length > 0 && !roles.includes(userRole as AdminRole)) {
    return null;
  }
  return Number(session.user.id);
}

/** Require an authenticated admin session (any role). Redirects to login. */
export async function requireAdmin(): Promise<number> {
  const adminId = await requireRole();
  if (adminId === null) {
    redirect("/admin/login");
    return 0;
  }
  return adminId;
}
