import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";

const ROLE_LEVEL: Record<"admin" | "editor" | "viewer", number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export type AdminRole = keyof typeof ROLE_LEVEL;

export interface AdminSession {
  id: number;
  role: AdminRole;
  email: string;
}

type GuardResult = { ok: true; session: AdminSession } | { ok: false; response: NextResponse };

/**
 * Route guard for admin APIs.
 *
 * Re-validates the admin's current DB row (role + isActive) on every call, so
 * a deactivated account or demoted role loses API access immediately even if
 * their JWT is still technically valid. This closes the "deactivated admin
 * keeps working" gap that a JWT-only check leaves open.
 *
 * `minRole` gates mutating endpoints by role level (admin > editor > viewer).
 */
export async function requireAdmin(options: { minRole?: AdminRole } = {}): Promise<GuardResult> {
  const { minRole = "viewer" } = options;

  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, Number(session.user.id)))
    .limit(1);

  if (!user?.isActive) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
    };
  }

  if (ROLE_LEVEL[user.role] < ROLE_LEVEL[minRole]) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    session: { id: user.id, role: user.role, email: user.email },
  };
}
