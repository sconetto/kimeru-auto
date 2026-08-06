import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminUsers } from "@/lib/db/schema";

/**
 * Shared NextAuth config — used by both the Node.js auth instance
 * (src/lib/auth/index.ts) and the edge middleware (src/middleware.ts).
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
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const [user] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.email, email.toLowerCase()))
          .limit(1);

        if (!user?.isActive) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

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
