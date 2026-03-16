import { NextResponse, type NextRequest } from "next/server";

import { DEMO_SESSION_COOKIE, DEMO_SESSION_VALUE } from "@/lib/app/session";

const PUBLIC_PATHS = ["/login", "/test"];
const PUBLIC_PREFIXES = ["/api", "/auth/callback"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasDemoSession = request.cookies.get(DEMO_SESSION_COOKIE)?.value === DEMO_SESSION_VALUE;

  if (hasDemoSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!hasDemoSession && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
