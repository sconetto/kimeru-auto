import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";
import { cache } from "@/lib/fipe/cache";
import { clientIp, createRateLimiter, rateLimitKey } from "@/lib/ratelimit";

const LOGIN_ACCOUNT_LIMIT = 5;
const LOGIN_ACCOUNT_WINDOW_SECONDS = 300;
const LOGIN_IP_LIMIT = 20;
const LOGIN_IP_WINDOW_SECONDS = 900;

/**
 * Login throttling buckets — checked before any DB/bcrypt work so brute-force
 * and username-enumeration attempts are cheap to reject.
 */
const loginAccountLimiter = createRateLimiter({
  limit: LOGIN_ACCOUNT_LIMIT,
  windowSeconds: LOGIN_ACCOUNT_WINDOW_SECONDS,
});
const loginIpLimiter = createRateLimiter({
  limit: LOGIN_IP_LIMIT,
  windowSeconds: LOGIN_IP_WINDOW_SECONDS,
});

/**
 * Shared NextAuth config — used by both the Node.js auth instance
 * (src/lib/auth/index.ts) and the edge middleware (src/proxy.ts).
 *
 * Must be edge-safe: no Node-only APIs at module scope.
 */

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const accountId = email.toLowerCase();
        const ip = request ? clientIp(request) : "unknown";

        // Throttled before any DB/bcrypt work (see limiter docs above).
        const [accountLimit, ipLimit] = await Promise.all([
          loginAccountLimiter(accountId),
          loginIpLimiter(ip),
        ]);
        if (!accountLimit.success || !ipLimit.success) return null;

        const [user] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.email, accountId))
          .limit(1);

        if (!user?.isActive) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        // Successful sign-in — clear both throttle buckets so a legitimate
        // user who mistyped a couple of times isn't locked out for the rest
        // of the window.
        await Promise.allSettled([
          cache.del(rateLimitKey(LOGIN_ACCOUNT_WINDOW_SECONDS, accountId)),
          cache.del(rateLimitKey(LOGIN_IP_WINDOW_SECONDS, ip)),
        ]);

        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    authorized({ auth: session, request }) {
      const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
      const isLoginPage = request.nextUrl.pathname === "/admin/login";
      const isApiAuth = request.nextUrl.pathname.startsWith("/api/auth");

      if (isApiAuth) return true;
      if (!isAdminRoute) return true;

      // Login page is always accessible; if already authenticated, let the
      // page component redirect to the dashboard.
      if (isLoginPage) return true;

      return !!session?.user;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
