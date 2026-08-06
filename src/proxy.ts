import type { NextFetchEvent, NextRequest } from "next/server";
import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { authConfig } from "@/lib/auth/auth-config";
import { routing } from "@/lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const { auth } = NextAuth(authConfig);

const authMiddleware = auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = req.nextUrl.pathname === "/admin/login";
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");
  const isAdminApi = req.nextUrl.pathname.startsWith("/api/admin");

  if (isApiAuth) return;
  if (isAdminApi && !req.auth?.user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (isAdminRoute && !isLoginPage && !req.auth?.user) {
    const loginUrl = new URL("/admin/login", req.url);
    return Response.redirect(loginUrl);
  }
  return;
}) as unknown as (
  request: NextRequest,
  event: NextFetchEvent,
) => Promise<Response | undefined> | Response | undefined;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  const isAdminOrApi = pathname.startsWith("/admin") || pathname.startsWith("/api");
  if (isAdminOrApi) {
    return authMiddleware(request, event);
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
