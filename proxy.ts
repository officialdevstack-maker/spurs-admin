import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifyAdminSession } from "@/lib/auth";

// Admin's OWN gate — its own session cookie, not the shared Spurs session.
//
// Open by necessity: /login, the bootstrap config API, the internal service
// APIs (which authenticate with the shared secret instead), and /invite — an
// invited person has no session yet, and the single-use token in the URL is
// the credential.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/config") ||
    pathname.startsWith("/api/plans") ||
    pathname.startsWith("/api/subscriptions") ||
    pathname.startsWith("/api/private/") ||
    pathname.startsWith("/invite/")
  ) {
    return NextResponse.next();
  }
  const session = await verifyAdminSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
