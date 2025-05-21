/**
 * @fileoverview Utility functions for simulating authentication in E2E tests.
 *
 * Provides a mock session object and a function to conditionally return
 * the mock session or the real session based on an environment variable.
 */

import { auth as realAuth } from '~/lib/auth'; // Import the real auth handler
import { type Session } from 'next-auth';

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

/**
 * Conditionally returns a mock session or the real session based on the E2E_TESTING environment variable.
 * Use this function in server-side contexts (middleware, server components, route handlers)
 * instead of directly calling `auth()` or `realAuth()`.
 */
export const getSessionForTest = async (): Promise<Session | null> => {
  // Check if we are in the E2E test environment
  if (process.env.E2E_TESTING === 'true') {
    console.log('[AuthUtil] E2E Test Mode: Returning mock session.');
    return mockE2eSession;
  } else {
    // In normal operation, call the real NextAuth auth function
    // console.log('[AuthUtil] Normal Mode: Calling real authentication.'); // Optional: for debugging normal flow
    return realAuth();
  }
}; 