/**
 * @fileoverview Integration tests for the Next.js middleware.
 *
 * These tests verify that the middleware correctly protects authenticated routes
 * by redirecting unauthenticated users to the login page.
 */

import { NextRequest, NextResponse } from 'next/server';
import middleware from '~/middleware'; // Import the middleware directly

// Define a type for the mocked request that includes the auth property
interface MockedNextRequest extends NextRequest {
  auth: { user: { id: string } } | null;
}

// Mock the auth function from ~/lib/auth
// This allows us to control the authentication state in our tests
jest.mock('~/lib/auth', () => ({
  __esModule: true,
  auth: jest.fn((handler: (req: MockedNextRequest) => Promise<NextResponse>) => (req: NextRequest) => {
    // Cast the request to our mocked type to add the auth property
    const mockedReq = req as MockedNextRequest;

    // This mock auth wrapper adds a mock `auth` property to the request
    // based on a test-specific variable (e.e. process.env.MOCK_AUTHED)
    if (process.env.MOCK_AUTHED === 'true') {
      mockedReq.auth = { user: { id: 'test-user' } }; // Simulate an authenticated user
    } else {
      mockedReq.auth = null; // Simulate an unauthenticated user
    }
    
    // Call the original handler with the mocked request
    return handler(mockedReq);
  }),
}));

describe('Middleware', () => {
  const mockRequest = (pathname: string, isAuthed = false) => {
    const req = new NextRequest(new URL(pathname, 'http://localhost'));
    // Use environment variable to signal mock auth state to the mocked auth function
    process.env.MOCK_AUTHED = isAuthed ? 'true' : 'false';
    // Return the request cast to the mocked type
    return req as MockedNextRequest; // Cast here as well for the test functions
  };

  // Clean up the mock environment variable after each test
  afterEach(() => {
    delete process.env.MOCK_AUTHED;
  });

  it('should redirect unauthenticated users from a protected route', async () => {
    const req = mockRequest('/dashboard', false); // Unauthenticated request to /dashboard
    const res = await middleware(req);

    // Expect a redirect response
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(307); // Temporary Redirect status
    expect(res.headers.get('location')).toBe('http://localhost/login');
  });

  it('should allow authenticated users to access a protected route', async () => {
    const req = mockRequest('/dashboard', true); // Authenticated request to /dashboard
    const res = await middleware(req);

    // Expect a next response (allowing the request to proceed)
    expect(res).toBeInstanceOf(NextResponse);
    // The status code for allowing the request to proceed might vary depending on Next.js internals,
    // but it should not be a redirect status.
    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
  });

  it('should allow unauthenticated users to access a public route', async () => {
    const req = mockRequest('/', false); // Unauthenticated request to /
    const res = await middleware(req);

    // Expect a next response
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
  });

  it('should allow authenticated users to access a public route', async () => {
    const req = mockRequest('/', true); // Authenticated request to /
    const res = await middleware(req);

    // Expect a next response
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
  });

  it('should allow access to API routes', async () => {
    const req = mockRequest('/api/trpc/some-procedure', false); // Unauthenticated request to API
    const res = await middleware(req);

    // Expect a next response
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
  });

  it('should allow access to the login page', async () => {
    const req = mockRequest('/login', false); // Unauthenticated request to login
    const res = await middleware(req);

    // Expect a next response
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
  });
}); 