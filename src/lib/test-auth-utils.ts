/**
 * @fileoverview Utility functions for simulating authentication in E2E tests and development.
 *
 * Provides mock session objects and functions to conditionally return
 * mock sessions or the real session based on environment variables.
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

// Define a development user session for quick testing
const mockDevSession: Session = {
  user: {
    id: 'dev-user-123',
    name: 'Dev User',
    email: 'dev@example.com',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

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
export const getSessionForTest = async (): Promise<Session | null> => {
  // Only allow bypasses in non-production environments for extra safety
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check if we are in the E2E test environment (highest priority)
  if (!isProduction && process.env.E2E_TESTING === 'true') {
    console.log('[AuthUtil] E2E Test Mode: Returning mock session.');
    return mockE2eSession;
  }
  
  // Check if we want to bypass auth for development (second priority)
  if (!isProduction && process.env.DEV_BYPASS_AUTH === 'true') {
    console.log('[AuthUtil] Development Mode: Bypassing auth with mock session.');
    return mockDevSession;
  }
  
  // In normal operation, call the real NextAuth auth function
  return realAuth();
}; 