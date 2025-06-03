/**
 * @fileoverview Component test for the root landing page.
 *
 * This test verifies that the root page correctly redirects authenticated users
 * to the dashboard and shows the sign-in prompt for unauthenticated users.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '~/app/page'; // Import the Home page component

// Mock the auth function from ~/lib/auth to control session state
jest.mock('~/lib/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));

// Mock the next/navigation module to assert redirects
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Get typed references to the mocked functions
// Use ES module imports and jest.mocked
import { auth } from '~/lib/auth';
import { redirect } from 'next/navigation';

const mockAuth = jest.mocked(auth);
const mockRedirect = jest.mocked(redirect);

describe('Home Page', () => {
  // Reset mocks before each test
  beforeEach(() => {
    mockAuth.mockClear();
    mockRedirect.mockClear();
  });

  it('should redirect to /dashboard if the user is authenticated', async () => {
    // Arrange: Simulate an authenticated session
    mockAuth.mockResolvedValue({ user: { id: 'test-user', name: 'Test User' } });

    // Act: Render the Home page (which should trigger the async auth check and redirect)
    // Need to use `await` because the component is async
    await render(await Home());

    // Assert: Verify that redirect was called with the dashboard path
    expect(mockAuth).toHaveBeenCalledTimes(1); // Ensure auth was checked
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
    // Ensure no other content is rendered when redirecting
    expect(screen.queryByText(/AI Interview Pro/i)).toBeNull();
  });

  it('should show the sign-in prompt if the user is not authenticated', async () => {
    // Arrange: Simulate no authenticated session
    mockAuth.mockResolvedValue(null);

    // Act: Render the Home page
    await render(await Home());

    // Assert: Verify that redirect was not called and the sign-in prompt is visible
    expect(mockAuth).toHaveBeenCalledTimes(1); // Ensure auth was checked
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /AI Interview Pro/i })).toBeInTheDocument();
    expect(screen.getByText(/Prepare for your interviews with AI. Sign in to continue./i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign In/i })).toBeInTheDocument();
  });
}); 