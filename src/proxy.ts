import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic route protection only (no DB access here — this runs on the edge).
// The real, secure authorization check happens in each page/route handler via
// requireUser()/requireAdmin() in src/lib/session.ts.
const PROTECTED_PREFIXES = ["/wallet", "/admin", "/api/wallet", "/api/admin"];
const AUTH_PAGES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("session")?.value);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected && !hasSession) {
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
