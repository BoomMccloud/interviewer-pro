/**
 * @fileoverview Tests for the Session Report page component.
 * Tests loading states, conditional rendering, data display, and tRPC integration.
 * Following Phase 1 established patterns for protected pages with tRPC hooks.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the tRPC hooks - declare before jest.mock to avoid hoisting issues
const mockGetSessionReportQuery = jest.fn();
const mockGetSessionAnalyticsQuery = jest.fn();
const mockGetSessionFeedbackQuery = jest.fn();

jest.mock('~/trpc/react', () => ({
  api: {
    session: {
      getSessionReport: {
        useQuery: mockGetSessionReportQuery,
      },
      getSessionAnalytics: {
        useQuery: mockGetSessionAnalyticsQuery,
      },
      getSessionFeedback: {
        useQuery: mockGetSessionFeedbackQuery,
      },
    },
  },
}));

// Mock the UI components
jest.mock('~/components/UI/Spinner', () => {
  return function MockSpinner() {
    return <div data-testid="spinner">Loading...</div>;
  };
});

jest.mock('~/components/Sessions/SessionOverview', () => {
  return function MockSessionOverview() {
    return <div data-testid="session-overview">Session Overview</div>;
  };
});

jest.mock('~/components/Sessions/SessionTimeline', () => {
  return function MockSessionTimeline() {
    return <div data-testid="session-timeline">Session Timeline</div>;
  };
});

jest.mock('~/components/Sessions/SessionAnalytics', () => {
  return function MockSessionAnalytics() {
    return <div data-testid="session-analytics">Session Analytics</div>;
  };
});

jest.mock('~/components/Sessions/SessionFeedback', () => {
  return function MockSessionFeedback() {
    return <div data-testid="session-feedback">Session Feedback</div>;
  };
});

// Import after mocks to ensure proper mocking
import { SessionReportContent } from '~/app/(protected)/sessions/[id]/report/report-content';

describe('SessionReportContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner initially when data is loading', () => {
    // Mock all queries as loading
    mockGetSessionReportQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    mockGetSessionAnalyticsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    mockGetSessionFeedbackQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<SessionReportContent sessionId="test-session-id" />);

    // Should show spinner initially
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByText(/loading session report/i)).toBeInTheDocument();
  });

  it('displays session report content after loading completes', () => {
    // Mock successful data loading
    const mockSessionReport = {
      sessionId: 'test-session-id',
      history: [],
      questionCount: 5,
      completionPercentage: 80,
      averageResponseTime: 45,
      durationInSeconds: 1800,
      createdAt: new Date(),
      updatedAt: new Date(),
      personaId: 'test-persona',
      jdResumeTextId: 'test-jd-resume',
    };

    const mockAnalytics = {
      sessionId: 'test-session-id',
      totalQuestions: 5,
      totalAnswers: 4,
      averageResponseTime: 45,
      responseTimeMetrics: [30, 45, 60, 35],
      completionPercentage: 80,
      sessionDurationMinutes: 30,
      performanceScore: 85,
    };

    const mockFeedback = {
      sessionId: 'test-session-id',
      overallScore: 85,
      strengths: ['Good communication'],
      areasForImprovement: ['Technical depth'],
      recommendations: ['Practice more algorithms'],
      detailedAnalysis: 'Overall good performance',
      skillAssessment: { 'Communication': 85 },
    };

    mockGetSessionReportQuery.mockReturnValue({
      data: mockSessionReport,
      isLoading: false,
      error: null,
    });
    mockGetSessionAnalyticsQuery.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
    });
    mockGetSessionFeedbackQuery.mockReturnValue({
      data: mockFeedback,
      isLoading: false,
      error: null,
    });

    render(<SessionReportContent sessionId="test-session-id" />);

    // Check that all report sections are rendered
    expect(screen.getByText('Session Report')).toBeInTheDocument();
    expect(screen.getByTestId('session-overview')).toBeInTheDocument();
    expect(screen.getByTestId('session-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('session-analytics')).toBeInTheDocument();
    expect(screen.getByTestId('session-feedback')).toBeInTheDocument();
  });

  it('displays error message when session report API call fails', async () => {
    // Mock session report query failure
    mockGetSessionReportQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Session not found or not authorized' },
    });
    mockGetSessionAnalyticsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockGetSessionFeedbackQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    render(<SessionReportContent sessionId="test-session-id" />);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/session not found or not authorized/i)).toBeInTheDocument();
    });
  });

  it('calls tRPC queries with correct session ID', () => {
    // Mock all queries as loading
    mockGetSessionReportQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    mockGetSessionAnalyticsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    mockGetSessionFeedbackQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<SessionReportContent sessionId="test-session-id" />);

    // Verify all tRPC queries were called with correct session ID
    expect(mockGetSessionReportQuery).toHaveBeenCalledWith({ sessionId: 'test-session-id' });
    expect(mockGetSessionAnalyticsQuery).toHaveBeenCalledWith({ sessionId: 'test-session-id' });
    expect(mockGetSessionFeedbackQuery).toHaveBeenCalledWith({ sessionId: 'test-session-id' });
  });

  it('gracefully handles missing analytics or feedback data', () => {
    // Mock session report success but analytics/feedback failure
    const mockSessionReport = {
      sessionId: 'test-session-id',
      history: [],
      questionCount: 5,
      completionPercentage: 80,
      averageResponseTime: 45,
      durationInSeconds: 1800,
      createdAt: new Date(),
      updatedAt: new Date(),
      personaId: 'test-persona',
      jdResumeTextId: 'test-jd-resume',
    };

    mockGetSessionReportQuery.mockReturnValue({
      data: mockSessionReport,
      isLoading: false,
      error: null,
    });
    mockGetSessionAnalyticsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Analytics unavailable' },
    });
    mockGetSessionFeedbackQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Feedback unavailable' },
    });

    render(<SessionReportContent sessionId="test-session-id" />);

    // Should still show overview and timeline
    expect(screen.getByTestId('session-overview')).toBeInTheDocument();
    expect(screen.getByTestId('session-timeline')).toBeInTheDocument();

    // Should show error messages for missing sections
    expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Feedback Unavailable')).toBeInTheDocument();
  });
}); 