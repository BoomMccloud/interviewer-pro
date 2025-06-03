/**
 * @fileoverview Tests for the Dashboard page component.
 * Tests loading states, conditional rendering, and basic interactions with real components.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
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

// Mock tRPC hooks
jest.mock('~/trpc/react', () => ({
  api: {
    jdResume: {
      getJdResumeText: {
        useQuery: jest.fn(),
      },
      saveJdResumeText: {
        useMutation: jest.fn(),
      },
    },
    session: {
      listForCurrentText: {
        useQuery: jest.fn(),
      },
      createSession: {
        useMutation: jest.fn(),
      },
    },
    useUtils: jest.fn(() => ({
      jdResume: {
        getJdResumeText: {
          invalidate: jest.fn(),
        },
      },
      session: {
        listForCurrentText: {
          invalidate: jest.fn(),
        },
      },
    })),
  },
}));

// Import the mocked API
import { api } from '~/trpc/react';

const mockPush = jest.fn();
const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockGetJdResumeTextQuery = api.jdResume.getJdResumeText.useQuery as jest.MockedFunction<typeof api.jdResume.getJdResumeText.useQuery>;
const mockListSessionsQuery = api.session.listForCurrentText.useQuery as jest.MockedFunction<typeof api.session.listForCurrentText.useQuery>;
const mockSaveJdResumeMutation = api.jdResume.saveJdResumeText.useMutation as jest.MockedFunction<typeof api.jdResume.saveJdResumeText.useMutation>;
const mockCreateSessionMutation = api.session.createSession.useMutation as jest.MockedFunction<typeof api.session.createSession.useMutation>;

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.mockReturnValue({
      push: mockPush,
    } as unknown as AppRouterInstance);

    // Default mock implementations for mutations
    mockSaveJdResumeMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    mockCreateSessionMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);
  });

  it('shows loading spinner initially', async () => {
    // Setup queries to return loading state
    mockGetJdResumeTextQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockListSessionsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(<DashboardPage />);

    // Should show spinner initially
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('shows dashboard content after loading completes', async () => {
    // Setup queries to return loaded state
    mockGetJdResumeTextQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockListSessionsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(<DashboardPage />);

    // Check dashboard content is rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Job Description & Resume')).toBeInTheDocument();
    expect(screen.getByText('Session History')).toBeInTheDocument();
  });

  it('displays the real form components when loaded', async () => {
    // Setup queries to return data
    mockGetJdResumeTextQuery.mockReturnValue({
      data: {
        id: 'test-id',
        userId: 'test-user',
        jdText: 'Test JD text',
        resumeText: 'Test resume text',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockListSessionsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(<DashboardPage />);
    
    // Check real form components are rendered
    expect(screen.getByLabelText('Job Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Resume')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start interview/i })).toBeInTheDocument();
    
    // Check session history
    expect(screen.getByText('No interview sessions yet')).toBeInTheDocument();
  });

  it('displays error message when API calls fail', async () => {
    // Setup queries to return error state
    mockGetJdResumeTextQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'API Error' },
      refetch: jest.fn(),
    } as any);

    mockListSessionsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(<DashboardPage />);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/API Error/)).toBeInTheDocument();
    });
  });
}); 