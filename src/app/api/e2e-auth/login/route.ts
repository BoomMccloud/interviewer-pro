/**
 * This route is exclusively for End-to-End (E2E) testing purposes.
 * It provides a programmatic way for Playwright to authenticate as a test user.
 *
 * How it works:
 * 1. The Playwright global setup file sends a POST request to this endpoint.
 * 2. This route handler verifies that the server is running in E2E test mode.
 * 3. It finds the pre-defined E2E test user in the database.
 * 4. It generates a valid NextAuth session token for that user.
 * 5. It sets the session cookie in the response headers.
 * 6. Playwright receives this cookie and can then make authenticated requests.
 *
 * Security:
 * - This route is only active when the `E2E_TESTING` environment variable is set to "true".
 * - It will not be available in production or development environments, ensuring no security holes.
 */
import { NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { db } from '~/server/db';

const E2E_TEST_USER_EMAIL = 'e2e-test@example.com';
const SECRET = process.env.AUTH_SECRET ?? '';

export async function POST() {
  // Ensure this route is only available in E2E testing environments
  if (process.env.E2E_TESTING !== 'true') {
    return new NextResponse(null, {
      status: 404,
      statusText: 'Not Found',
    });
  }

  if (!SECRET) {
    throw new Error('AUTH_SECRET environment variable is not set.');
  }

  // Find the test user in the database
  const testUser = await db.user.findUnique({
    where: { email: E2E_TEST_USER_EMAIL },
  });

  if (!testUser) {
    return new NextResponse(
      JSON.stringify({
        message:
          'E2E test user not found. Ensure the database is seeded correctly.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const token = {
    sub: testUser.id,
    name: testUser.name,
    email: testUser.email,
    picture: testUser.image,
  };

  const cookieName =
    process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

  const sessionToken = await encode({
    token,
    secret: SECRET,
    salt: cookieName,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  const response = new NextResponse(
    JSON.stringify({ message: 'Login successful' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );

  // Set the session cookie. The cookie name and options must match your NextAuth config.
  // Check your authConfig for the specific cookie name (it's often prefixed).
  // The default is `__Secure-next-auth.session-token` or `next-auth.session-token` for dev.
  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
  });

  return response;
} 