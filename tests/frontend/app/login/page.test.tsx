/**
 * @fileoverview Component test for the Login page.
 *
 * This test verifies that the "Sign in with Google" button
 * on the login page correctly calls the `signIn` function from next-auth/react.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from '~/app/login/page'; // Import the Login page component

// Mock the signIn function from next-auth/react
jest.mock('next-auth/react', () => ({
  __esModule: true,
  signIn: jest.fn(),
}));

// Get a typed reference to the mocked signIn function
import { signIn } from 'next-auth/react'; // Import the actual module
const mockSignIn = jest.mocked(signIn); // Use jest.mocked to get a typed mock

describe('LoginPage', () => {
  // Reset the mock before each test to ensure isolation
  beforeEach(() => {
    mockSignIn.mockClear();
  });

  it('should render the Sign In heading and button', () => {
    render(<LoginPage />);
    // Assert that the heading is present
    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
    // Assert that the button is present
    expect(screen.getByRole('button', { name: /Sign in with Google/i })).toBeInTheDocument();
  });

  it('should call signIn with "google" when the button is clicked', () => {
    render(<LoginPage />);
    const googleSignInButton = screen.getByRole('button', { name: /Sign in with Google/i });
    
    // Simulate a click event on the button
    fireEvent.click(googleSignInButton);

    // Assert that the mocked signIn function was called
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    // Assert that signIn was called with the 'google' provider ID
    expect(mockSignIn).toHaveBeenCalledWith('google');
  });
}); 