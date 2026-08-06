import NextAuth from "next-auth";
import "../env";
import { authConfig } from "./auth-config";

/**
 * NextAuth v5 instance for the Node.js runtime (route handlers,
 * server actions, server components).
 *
 * The edge middleware uses `NextAuth(authConfig).auth` directly —
 * see src/proxy.ts.
 *
 * Session/JWT type augmentation lives in src/types/next-auth.d.ts.
 */

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
