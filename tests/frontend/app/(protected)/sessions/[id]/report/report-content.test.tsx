/**
 * Test suite for the ReportContent component.
 *
 * This component is responsible for fetching and displaying the overall
 * assessment from an interview session. These tests will verify its behavior
 * in various states: loading, success (displaying data), and error.
 *
 * Mocks are used for the tRPC client to simulate API responses.
 */
import { render, screen, waitFor } from '@testing-library/react';
import ReportContent from '~/app/(protected)/sessions/[id]/report/report-content';
import { api } from '~/trpc/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RouterOutputs } from '~/trpc/react';
import '@testing-library/jest-dom';

// Mock tRPC and next/navigation
jest.mock('~/trpc/react', () => ({
  api: {
    report: {
      getOverallAssessment: {
        useQuery: jest.fn(),
      },
    },
    session: {
      getSessionById: {
        useQuery: jest.fn(),
      }
    }
  },
}));

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

import { useParams, useRouter } from 'next/navigation';

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

type OverallAssessmentOutput = RouterOutputs['report']['getOverallAssessment'];
type SessionOutput = RouterOutputs['session']['getSessionById'];

describe('ReportContent Component', () => {
  const mockAssessmentData: OverallAssessmentOutput = {
    // @ts-expect-error - This is the target state, the type is not yet updated
    assessment: {
        summary: 'This is a test summary.',
        strengths: ['Great problem solving', 'Clear communication'],
        improvements: ['Could provide more detailed examples'],
        score: 85,
    },
    persona: { id: 'test-persona', name: 'Test Persona', systemPrompt: '' },
    durationInSeconds: 600,
  };

  const mockSessionData: SessionOutput = {
    id: 'test-session-id',
    personaId: 'test-persona',
    durationInSeconds: 600,
    questionSegments: [],
    currentQuestionIndex: 0,
    overallSummary: null,
    jdResumeTextId: 'jd-1',
    startTime: new Date(),
    endTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user-1',
  };

  beforeEach(() => {
    // Reset mocks before each test
    (api.report.getOverallAssessment.useQuery as jest.Mock).mockClear();
    (api.session.getSessionById.useQuery as jest.Mock).mockClear();
    (useParams as jest.Mock).mockReturnValue({ id: 'test-session-id' });
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  });

  it('should display a loading spinner while fetching data', () => {
    // Arrange
    (api.report.getOverallAssessment.useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    (api.session.getSessionById.useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    // Act
    render(<ReportContent />, { wrapper });

    // Assert
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display an error message if fetching fails', () => {
    // Arrange
    (api.report.getOverallAssessment.useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: 'Failed to fetch assessment' },
    });
    (api.session.getSessionById.useQuery as jest.Mock).mockReturnValue({
      data: mockSessionData,
      isLoading: false,
      isError: false,
    });

    // Act
    render(<ReportContent />, { wrapper });

    // Assert
    expect(screen.getByText(/Error loading report/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch assessment/i)).toBeInTheDocument();
  });

  it('should display the overall assessment details when data is fetched successfully', async () => {
    // Arrange
    (api.report.getOverallAssessment.useQuery as jest.Mock).mockReturnValue({
      data: mockAssessmentData,
      isLoading: false,
      isError: false,
    });
    (api.session.getSessionById.useQuery as jest.Mock).mockReturnValue({
      data: mockSessionData,
      isLoading: false,
      isError: false,
    });

    // Act
    render(<ReportContent />, { wrapper });

    // Assert
    // These assertions are expected to FAIL until the component is updated (RED phase of TDD)
    await waitFor(() => {
        expect(screen.getByText('Overall Assessment')).toBeInTheDocument();
        expect(screen.getByText('This is a test summary.')).toBeInTheDocument();
        expect(screen.getByText('Strengths')).toBeInTheDocument();
        expect(screen.getByText('Great problem solving')).toBeInTheDocument();
        expect(screen.getByText('Clear communication')).toBeInTheDocument();
        expect(screen.getByText('Areas for Improvement')).toBeInTheDocument();
        expect(screen.getByText('Could provide more detailed examples')).toBeInTheDocument();
        expect(screen.getByText(/Overall Score: 85/)).toBeInTheDocument();
    });
  });

  it('should handle the case where assessment data is missing or empty', () => {
    // Arrange
    (api.report.getOverallAssessment.useQuery as jest.Mock).mockReturnValue({
      data: { ...mockAssessmentData, assessment: null },
      isLoading: false,
      isError: false,
    });
    (api.session.getSessionById.useQuery as jest.Mock).mockReturnValue({
      data: mockSessionData,
      isLoading: false,
      isError: false,
    });

    // Act
    render(<ReportContent />, { wrapper });

    // Assert
    expect(screen.getByText(/No assessment data found/i)).toBeInTheDocument();
  });
}); 