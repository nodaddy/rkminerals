import { NextResponse } from "next/server";

// Since we're using client-side authentication with Firebase,
// we'll keep this middleware minimal. In a real-world app,
// you might want to validate tokens server-side as well.

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Add any protected routes logic here if needed
  // For example, if you need to protect API routes or have server-side validation

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Add paths that should be checked by the middleware
    "/dashboard/:path*",
    "/tools/:path*",
    "/api/:path*",
  ],
};
