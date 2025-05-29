/**
 * @fileoverview Tests for the Dashboard page component.
 * Tests loading states, conditional rendering, and basic interactions.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import DashboardPage from '~/app/(protected)/dashboard/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the Spinner component
jest.mock('~/components/UI/Spinner', () => {
  return function MockSpinner() {
    return <div data-testid="spinner">Loading...</div>;
  };
});

const mockPush = jest.fn();
const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    } as AppRouterInstance);
  });

  it('shows loading spinner initially', () => {
    render(<DashboardPage />);
    
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows dashboard content after loading completes', async () => {
    render(<DashboardPage />);
    
    // Initially shows loading
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    
    // Wait for loading to complete (300ms simulated delay + some buffer)
    await waitFor(
      () => {
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
      },
      { timeout: 1000 }
    );
    
    // Check that main content is displayed
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Job Description & Resume')).toBeInTheDocument();
    expect(screen.getByText('Session History')).toBeInTheDocument();
  });

  it('displays the correct page structure when loaded', async () => {
    render(<DashboardPage />);
    
    // Wait for loading to complete
    await waitFor(
      () => {
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
      },
      { timeout: 1000 }
    );
    
    // Check main heading
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    
    // Check section headings
    expect(screen.getByRole('heading', { level: 2, name: 'Job Description & Resume' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Session History' })).toBeInTheDocument();
    
    // Check placeholder components are rendered
    expect(screen.getByText('JD/Resume Input Form Placeholder')).toBeInTheDocument();
    expect(screen.getByText('Session History List Placeholder')).toBeInTheDocument();
  });

  it('has proper grid layout classes', async () => {
    render(<DashboardPage />);
    
    // Wait for loading to complete
    await waitFor(
      () => {
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
      },
      { timeout: 1000 }
    );
    
    // Check that the grid container exists
    const gridContainer = screen.getByText('Job Description & Resume').closest('.grid');
    expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6');
  });
}); 