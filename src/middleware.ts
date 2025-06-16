/**
 * @fileoverview Next.js middleware to protect authenticated routes.
 *
 * This middleware uses a conditional session utility to check
 * authentication status (real or mocked for E2E tests) and redirect
 * unauthenticated users from protected routes.
 */

import { getSessionForTest } from "~/lib/test-auth-utils";
import { NextResponse, type NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/sessions'];

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const session = await getSessionForTest(req);
  const isAuthenticated = !!session;

  // For debugging in E2E test mode
  if (process.env.E2E_TESTING === 'true') {
    console.log(`[Middleware] E2E_TESTING=${process.env.E2E_TESTING}, Path: ${nextUrl.pathname}, Authenticated: ${isAuthenticated}`);
  }

  console.log('[Middleware] Session:', session, 'Path:', nextUrl.pathname);

  if (!isAuthenticated && protectedRoutes.some(route => nextUrl.pathname.startsWith(route))) {
    if (process.env.E2E_TESTING === 'true') {
      console.log('[Middleware] E2E Test Mode: Unauthenticated access to protected route, redirecting to /login.');
    }
    const loginUrl = new URL('/login', nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }
  
  // If authenticated and trying to access login, redirect to dashboard
  if (isAuthenticated && nextUrl.pathname === '/login') {
    if (process.env.E2E_TESTING === 'true') {
      console.log('[Middleware] E2E Test Mode: Authenticated access to /login, redirecting to /dashboard.');
    }
    return NextResponse.redirect(new URL('/dashboard', nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)?', // Match all except specific assets and API routes
  ],
}; 