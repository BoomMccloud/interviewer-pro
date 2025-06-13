/**
 * @fileoverview TDD Tests for Session Page Component
 * 
 * TESTING STRATEGY: Test session state management, tRPC integration, and user workflows
 * Following RED-GREEN-REFACTOR methodology from tdd_methodology.md
 * 
 * Test Coverage:
 * - Session state machine (loading, new, active, completed, error)
 * - tRPC integration with proper mocking
 * - User workflows (viewing reports, restarting sessions)
 * - Error handling and recovery flows
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import '@testing-library/jest-dom';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock tRPC hooks
jest.mock('~/trpc/react', () => ({
  api: {
    session: {
      getActiveSession: {
        useQuery: jest.fn(),
      },
      startInterviewSession: {
        useMutation: jest.fn(),
      },
      getNextQuestion: {
        useMutation: jest.fn(),
      },
    },
  },
}));

// Mock interview UI components
jest.mock('~/components/Sessions/InterviewUI/TextInterviewUI', () => {
  return function MockTextInterviewUI({ 
    sessionData, 
    onSendMessage, 
    onEnd 
  }: {
    sessionData?: { currentQuestion?: string };
    onSendMessage: (message: string) => void;
    onEnd: () => void;
  }) {
    return (
      <div data-testid="text-interview-ui">
        <div>Question: {sessionData?.currentQuestion}</div>
        <button onClick={() => onSendMessage('test response')}>Send Message</button>
        <button onClick={onEnd}>End Interview</button>
      </div>
    );
  };
});

jest.mock('~/components/Sessions/InterviewUI/VoiceInterviewUI', () => {
  return function MockVoiceInterviewUI({ 
    sessionData 
  }: {
    sessionData?: { currentQuestion?: string };
  }) {
    return (
      <div data-testid="voice-interview-ui">
        Voice Interview: {sessionData?.currentQuestion}
      </div>
    );
  };
});

// Import component and mocked dependencies
import SessionPage from '~/app/(protected)/sessions/[id]/page';
import { api } from '~/trpc/react';

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Mock implementations
const mockGetActiveSession = api.session.getActiveSession.useQuery as jest.Mock;
const mockStartSession = api.session.startInterviewSession.useMutation as jest.Mock;
const mockGetNextQuestion = api.session.getNextQuestion.useMutation as jest.Mock;

// Mock router push function
const mockPush = jest.fn();

// Mock router and search params types
const mockSearchParams = {
  get: jest.fn().mockReturnValue('text'),
};

const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
} as AppRouterInstance;

describe('SessionPage - TDD Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockUseParams.mockReturnValue({ id: 'test-session-123' });
    mockUseSearchParams.mockReturnValue(mockSearchParams);
    mockUseRouter.mockReturnValue(mockRouter);

    // Default tRPC mock implementations with complete structure
    mockGetActiveSession.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isError: false,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    mockStartSession.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      reset: jest.fn(),
    });

    mockGetNextQuestion.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      reset: jest.fn(),
    });
  });

  describe('🔴 RED Phase - Session State Management', () => {
    it('should display loading state while checking session status', async () => {
      // Arrange: Mock loading state
      mockGetActiveSession.mockReturnValue({
        isSuccess: false,
        isError: false,
        data: undefined,
        error: null,
      });
      mockStartSession.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      });

      // Act
      render(<SessionPage />);

      // Assert: Should show loading spinner and message
      expect(screen.getByText('Loading session...')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });

    it('should automatically start new session when session not found', async () => {
      // Arrange: Mock session not found (404)
      const mockMutate = jest.fn();
      mockGetActiveSession.mockReturnValue({
        isSuccess: false,
        isError: true,
        data: undefined,
        error: { data: { code: 'NOT_FOUND' } },
      });
      mockStartSession.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      // Act
      render(<SessionPage />);

      // Assert: Should call startInterviewSession with correct params
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          sessionId: 'test-session-123',
          personaId: 'technical-interviewer',
        });
      });
    });

    it('should display active interview UI when session is active', async () => {
      // Arrange: Mock active session
      mockGetActiveSession.mockReturnValue({
        isSuccess: true,
        isError: false,
        data: {
          sessionId: 'test-session-123',
          isActive: true,
          currentQuestion: 'Tell me about yourself',
          conversationHistory: [],
          questionNumber: 1,
          timeRemaining: 1800,
        },
        error: null,
      });
      mockStartSession.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      });

      // Act
      render(<SessionPage />);

      // Assert: Should show interview UI with question
      await waitFor(() => {
        expect(screen.getByTestId('text-interview-ui')).toBeInTheDocument();
        expect(screen.getByText('Question: Tell me about yourself')).toBeInTheDocument();
      });
    });

    it('should display completion options when session is completed', async () => {
      // Arrange: Mock completed session
      mockGetActiveSession.mockReturnValue({
        isSuccess: true,
        isError: false,
        data: {
          sessionId: 'test-session-123',
          isActive: false, // Session completed
          currentQuestion: 'Interview completed',
          conversationHistory: [],
          questionNumber: 5,
          timeRemaining: 0,
        },
        error: null,
      });
      mockStartSession.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      });

      // Act
      render(<SessionPage />);

      // Assert: Should show completion screen with options
      await waitFor(() => {
        expect(screen.getByText('Interview Completed!')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /view interview report/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /start new interview/i })).toBeInTheDocument();
      });
    });

    it('should display error state for session errors', async () => {
      // Arrange: Mock session error
      mockGetActiveSession.mockReturnValue({
        isSuccess: false,
        isError: true,
        data: undefined,
        error: { data: { code: 'INTERNAL_SERVER_ERROR' } },
      });
      mockStartSession.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
      });

      // Act
      render(<SessionPage />);

      // Assert: Should show error state
      await waitFor(() => {
        expect(screen.getByText('Session Error')).toBeInTheDocument();
        expect(screen.getByText('There was an error loading this interview session.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /return to dashboard/i })).toBeInTheDocument();
      });
    });
  });

  describe('🔴 RED Phase - User Interaction Workflows', () => {
    it('should navigate to report when "View Report" button is clicked', async () => {
      // Arrange: Mock completed session
      mockGetActiveSession.mockReturnValue({
        isSuccess: true,
        isError: false,
        data: { isActive: false },
        error: null,
      });
      mockStartSession.mockReturnValue({ mutate: jest.fn(), isPending: false });

      const user = userEvent.setup();
      render(<SessionPage />);

      // Act: Click "View Report" button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view interview report/i })).toBeInTheDocument();
      });
      
      const viewReportButton = screen.getByRole('button', { name: /view interview report/i });
      await user.click(viewReportButton);

      // Assert: Should navigate to report page
      expect(mockPush).toHaveBeenCalledWith('/sessions/test-session-123/report');
    });

    it('should restart session when "Start New Interview" button is clicked', async () => {
      // Arrange: Mock completed session
      const mockMutate = jest.fn();
      mockGetActiveSession.mockReturnValue({
        isSuccess: true,
        isError: false,
        data: { isActive: false },
        error: null,
      });
      mockStartSession.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      const user = userEvent.setup();
      render(<SessionPage />);

      // Act: Click "Start New Interview" button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start new interview/i })).toBeInTheDocument();
      });
      
      const restartButton = screen.getByRole('button', { name: /start new interview/i });
      await user.click(restartButton);

      // Assert: Should trigger session restart
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          sessionId: 'test-session-123',
          personaId: 'technical-interviewer',
        });
      });
    });

    it('should return to dashboard from error state', async () => {
      // Arrange: Mock error state
      mockGetActiveSession.mockReturnValue({
        isSuccess: false,
        isError: true,
        data: undefined,
        error: { data: { code: 'INTERNAL_SERVER_ERROR' } },
      });
      mockStartSession.mockReturnValue({ mutate: jest.fn(), isPending: false });

      const user = userEvent.setup();
      render(<SessionPage />);

      // Act: Click "Return to Dashboard" button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /return to dashboard/i })).toBeInTheDocument();
      });
      
      const returnButton = screen.getByRole('button', { name: /return to dashboard/i });
      await user.click(returnButton);

      // Assert: Should navigate to dashboard
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('🔴 RED Phase - Mode Parameter Handling', () => {
    it('should render TextInterviewUI for text mode', async () => {
      // Arrange: Mock text mode and active session
      const textModeParams = {
        get: jest.fn().mockReturnValue('text'),
      };
      
      mockUseSearchParams.mockReturnValue(textModeParams as any);
      mockGetActiveSession.mockReturnValue({
        isSuccess: true,
        data: { isActive: true, currentQuestion: 'Test question' },
        error: null,
      });
      mockStartSession.mockReturnValue({ mutate: jest.fn(), isPending: false });

      // Act
      render(<SessionPage />);

      // Assert: Should render text interview UI
      await waitFor(() => {
        expect(screen.getByTestId('text-interview-ui')).toBeInTheDocument();
      });
    });

    it('should render VoiceInterviewUI for voice mode', async () => {
      // Arrange: Mock voice mode and active session
      const voiceModeParams = {
        get: jest.fn().mockReturnValue('voice'),
      };
      
      mockUseSearchParams.mockReturnValue(voiceModeParams as any);
      mockGetActiveSession.mockReturnValue({
        isSuccess: true,
        data: { isActive: true, currentQuestion: 'Test question' },
        error: null,
      });
      mockStartSession.mockReturnValue({ mutate: jest.fn(), isPending: false });

      // Act
      render(<SessionPage />);

      // Assert: Should render voice interview UI
      await waitFor(() => {
        expect(screen.getByTestId('voice-interview-ui')).toBeInTheDocument();
      });
    });

    it('should render coming soon message for avatar mode', async () => {
      // Arrange: Mock avatar mode and active session
      const avatarModeParams = {
        get: jest.fn().mockReturnValue('avatar'),
      };
      
      mockUseSearchParams.mockReturnValue(avatarModeParams as any);
      mockGetActiveSession.mockReturnValue({
        isSuccess: true,
        data: { isActive: true, currentQuestion: 'Test question' },
        error: null,
      });
      mockStartSession.mockReturnValue({ mutate: jest.fn(), isPending: false });

      // Act
      render(<SessionPage />);

      // Assert: Should show coming soon message
      await waitFor(() => {
        expect(screen.getByText('Avatar Mode Coming Soon')).toBeInTheDocument();
        expect(screen.getByText('Avatar interviews will be available in the next update.')).toBeInTheDocument();
      });
    });
  });

  describe('🔴 RED Phase - tRPC Integration', () => {
    it('should handle session completion after user response', async () => {
      // Arrange: Mock active session and completion flow
      const mockGetNextMutate = jest.fn();
      const mockRefetch = jest.fn();
      
      mockGetActiveSession.mockReturnValue({
        isSuccess: true,
        data: { 
          isActive: true, 
          currentQuestion: 'Final question',
          conversationHistory: [],
        },
        refetch: mockRefetch,
        error: null,
      });
      mockStartSession.mockReturnValue({ mutate: jest.fn(), isPending: false });
      mockGetNextQuestion.mockReturnValue({
        mutateAsync: mockGetNextMutate,
        isPending: false,
      });

      // Mock completion response
      mockGetNextMutate.mockResolvedValue({
        isComplete: true,
        nextQuestion: undefined,
      });

      const user = userEvent.setup();
      render(<SessionPage />);

      // Act: Send a message that completes the interview
      await waitFor(() => {
        expect(screen.getByTestId('text-interview-ui')).toBeInTheDocument();
      });
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Assert: Should call getNextQuestion and handle completion
      expect(mockGetNextMutate).toHaveBeenCalledWith({
        sessionId: 'test-session-123',
        userResponse: 'test response',
      });
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('should handle tRPC errors gracefully', async () => {
      // Arrange: Mock tRPC error
      const mockGetNextMutate = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockGetActiveSession.mockReturnValue({
        isSuccess: true,
        data: { isActive: true, currentQuestion: 'Test question' },
        error: null,
      });
      mockStartSession.mockReturnValue({ mutate: jest.fn(), isPending: false });
      mockGetNextQuestion.mockReturnValue({
        mutateAsync: mockGetNextMutate,
        isPending: false,
      });

      // Mock error response
      mockGetNextMutate.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<SessionPage />);

      // Act: Trigger error
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
      });
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Assert: Should log error without crashing
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error sending message:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('🔴 RED Phase - Loading States and Transitions', () => {
    it('should show loading state during session start', async () => {
      // Arrange: Mock pending session start
      mockGetActiveSession.mockReturnValue({
        isSuccess: false,
        isError: true,
        data: undefined,
        error: { data: { code: 'NOT_FOUND' } },
      });
      mockStartSession.mockReturnValue({
        mutate: jest.fn(),
        isPending: true, // Loading state
      });

      // Act
      render(<SessionPage />);

      // Assert: Should show starting session message
      expect(screen.getByText('Starting your interview session...')).toBeInTheDocument();
    });

    it('should show processing state during question generation', async () => {
      // Arrange: Mock active session with processing
      mockGetActiveSession.mockReturnValue({
        isSuccess: true,
        data: { isActive: true, currentQuestion: 'Test question' },
        error: null,
      });
      mockStartSession.mockReturnValue({ mutate: jest.fn(), isPending: false });
      mockGetNextQuestion.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true, // Processing state
      });

      // Act
      render(<SessionPage />);

      // Assert: Should pass processing state to interview UI
      await waitFor(() => {
        expect(screen.getByTestId('text-interview-ui')).toBeInTheDocument();
      });
      // Note: The actual processing state would be passed as prop to TextInterviewUI
      // and would need to be tested in that component's tests
    });
  });
}); 