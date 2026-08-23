import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic route protection only (no DB access here — this runs on the edge).
// The real, secure authorization check happens in each page/route handler via
// requireUser()/requireAdmin() in src/lib/session.ts.
//
// Only HTML page routes redirect here — API routes must never redirect an
// unauthenticated request to a login page. Every /api/** handler already
// performs its own requireUser()/requireAdmin() check and returns a proper
// 401/403 JSON response, which is what API clients expect.
const PROTECTED_PAGE_PREFIXES = ["/wallet", "/admin"];
const AUTH_PAGES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("session")?.value);

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtectedPage && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/wallet", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
