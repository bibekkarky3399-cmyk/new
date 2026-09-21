import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// Lightweight edge check: only verifies a session cookie is present, so logged-out
// users are redirected immediately. Full JWT verification + tenant checks happen
// server-side in the dashboard layout (see src/app/dashboard/layout.tsx), since
// jsonwebtoken requires the Node.js runtime.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
