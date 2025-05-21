/**
 * @fileoverview Next.js middleware to protect authenticated routes.
 *
 * This middleware uses the NextAuth v5 `auth` function to check
 * authentication status and redirect unauthenticated users from
 * protected routes.
 */

import { auth } from "~/lib/auth";
import { NextResponse } from 'next/server';

const protectedRoutes = ['/dashboard', '/sessions']; // Add other protected routes here if needed

export default auth(async function middleware(req) {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth; // req.auth is available after using the auth() wrapper

  // Redirect unauthenticated users trying to access protected routes
  if (!isAuthenticated && protectedRoutes.some(route => nextUrl.pathname.startsWith(route))) {
    const loginUrl = new URL('/login', nextUrl.origin);
    // Optional: Add a 'callbackUrl' search param to redirect back after login
    // loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow authenticated users to access all routes, or continue to unprotected routes
  return NextResponse.next();
});

// Configure the matcher to run the middleware only on relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (the login page itself)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)?',
  ],
}; 