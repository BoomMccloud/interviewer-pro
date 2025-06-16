/**
 * @fileoverview Utility functions for simulating authentication in E2E tests and development.
 *
 * Provides mock session objects and functions to conditionally return
 * mock sessions or the real session based on environment variables.
 */

import { auth as realAuth } from '~/lib/auth'; // Import the real auth handler
import { type Session } from 'next-auth';
import { db } from '~/server/db';
import { type NextRequest } from 'next/server';

// Define a static mock user object for development and seeding
export const MOCK_USER_ID = 'test-user-for-interviewer-pro';
export const MOCK_USER_EMAIL = 'test-user@interviewer.pro';
export const MOCK_USER_NAME = 'Mock Test User';

// Define a static mock session object for E2E tests
const mockE2eSession: Session = {
  user: {
    id: 'e2e-test-user-id-123', // Consistent dummy ID
    name: 'E2E Test User',
    email: 'e2e-test@example.com',
    image: null, // Or a mock image URL
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Set a future expiration
};

// Define a development user session for quick testing
const mockDevSession: Session = {
  user: {
    id: MOCK_USER_ID,
    name: MOCK_USER_NAME,
    email: MOCK_USER_EMAIL,
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// No top-level import of `next/headers` to keep this module universal. We will
// fall back to a runtime `import()` when needed (inside an `async` context) so
// common-js `require` (and associated linter warnings) are avoided.

/**
 * Conditionally returns a mock session or the real session based on environment variables.
 * Use this function in server-side contexts (middleware, server components, route handlers)
 * instead of directly calling `auth()` or `realAuth()`.
 * 
 * Environment variable priority:
 * 1. E2E_TESTING=true - Returns E2E test session (non-production only)
 * 2. DEV_BYPASS_AUTH=true - Returns development session (non-production only)
 * 3. Normal operation - Returns real NextAuth session
 */
export const getSessionForTest = async (req?: NextRequest): Promise<Session | null> => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // E2E Testing Mode
  if (!isProduction && process.env.E2E_TESTING === 'true') {
    // Determine auth state depending on where we can read headers from
    let headerValue: string | null | undefined;
    if (req) {
      headerValue = req.headers.get('x-test-auth-state');
    } else {
      // Dynamically import next/headers only when running in an environment
      // (e.g. app router) where it is available. Surround with try/catch so
      // unit tests or build time that lack the module don't explode.
      try {
        // eslint-disable-next-line import/no-extraneous-dependencies
        const { headers: runtimeHeaders } = await import('next/headers');
        // Next.js 15: `headers()` returns a Promise that resolves to a ReadonlyHeaders instance.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const h = await (runtimeHeaders as unknown as () => Promise<Headers>)();
        headerValue = h.get('x-test-auth-state');
      } catch {
        headerValue = null;
      }
    }

    const isLoggedOut = headerValue === 'logged-out';
    return isLoggedOut ? null : mockE2eSession;
  }

  // Development Bypass (unchanged)
  if (!isProduction && process.env.DEV_BYPASS_AUTH === 'true') {
    console.log('[AuthUtil] Development Mode: Bypassing auth with mock session.');
    return mockDevSession;
  }

  // Normal operation
  return realAuth();
}; 