/**
 * @fileoverview Tests for the Session page component with parameter-based routing.
 * Tests mode parameter routing (text/voice/avatar), default behavior, and component rendering.
 * Following TDD methodology - these tests start as FAILING tests (RED phase).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Define proper types for mock components
interface MockSessionData {
  sessionId: string;
}

interface MockInterviewUIProps {
  sessionData: MockSessionData;
}

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock the Timer component
jest.mock('~/components/UI/Timer', () => {
  return function MockTimer() {
    return <div data-testid="timer">00:00</div>;
  };
});

// Mock the Interview UI components with proper typing
jest.mock('~/components/Sessions/InterviewUI/TextInterviewUI', () => {
  return function MockTextInterviewUI({ sessionData }: MockInterviewUIProps) {
    return <div data-testid="text-interview-ui">Text Interview Mode - Session: {sessionData.sessionId}</div>;
  };
});

jest.mock('~/components/Sessions/InterviewUI/VoiceInterviewUI', () => {
  return function MockVoiceInterviewUI({ sessionData }: MockInterviewUIProps) {
    return <div data-testid="voice-interview-ui">Voice Interview Mode - Session: {sessionData.sessionId}</div>;
  };
});

// Helper function to create ReadonlyURLSearchParams mock
const createMockSearchParams = (searchString: string) => {
  const params = new URLSearchParams(searchString);
  return {
    get: (key: string) => params.get(key),
  } as ReadonlyURLSearchParams;
};

// Import after mocks to ensure proper mocking
import { useParams, useSearchParams } from 'next/navigation';
import SessionPage from '~/app/(protected)/sessions/[id]/page';

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

describe('SessionPage Parameter Routing - TDD RED Phase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock setup
    mockUseParams.mockReturnValue({ id: 'test-session-123' });
  });

  describe('🔴 RED: Mode Parameter Routing', () => {
    it('should render TextInterviewUI when mode=text', () => {
      // Arrange: Mock search params to return mode=text
      const mockSearchParams = createMockSearchParams('mode=text');
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      // Act: Render the session page
      render(<SessionPage />);

      // Assert: TextInterviewUI should be rendered
      expect(screen.getByTestId('text-interview-ui')).toBeInTheDocument();
      expect(screen.getByText(/Text Interview Mode/)).toBeInTheDocument();
      expect(screen.getByText(/Session: test-session-123/)).toBeInTheDocument();
      
      // Assert: Other modes should NOT be rendered
      expect(screen.queryByTestId('voice-interview-ui')).not.toBeInTheDocument();
      expect(screen.queryByText(/Avatar mode coming soon/)).not.toBeInTheDocument();
    });

    it('should render VoiceInterviewUI when mode=voice', () => {
      // Arrange: Mock search params to return mode=voice
      const mockSearchParams = createMockSearchParams('mode=voice');
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      // Act: Render the session page
      render(<SessionPage />);

      // Assert: VoiceInterviewUI should be rendered
      expect(screen.getByTestId('voice-interview-ui')).toBeInTheDocument();
      expect(screen.getByText(/Voice Interview Mode/)).toBeInTheDocument();
      expect(screen.getByText(/Session: test-session-123/)).toBeInTheDocument();
      
      // Assert: Other modes should NOT be rendered
      expect(screen.queryByTestId('text-interview-ui')).not.toBeInTheDocument();
      expect(screen.queryByText(/Avatar mode coming soon/)).not.toBeInTheDocument();
    });

    it('should show avatar placeholder when mode=avatar', () => {
      // Arrange: Mock search params to return mode=avatar
      const mockSearchParams = createMockSearchParams('mode=avatar');
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      // Act: Render the session page
      render(<SessionPage />);

      // Assert: Avatar placeholder should be rendered
      expect(screen.getByText('Avatar Mode Coming Soon')).toBeInTheDocument();
      expect(screen.getByText('Avatar interviews will be available in the next update.')).toBeInTheDocument();
      
      // Assert: Interview UIs should NOT be rendered
      expect(screen.queryByTestId('text-interview-ui')).not.toBeInTheDocument();
      expect(screen.queryByTestId('voice-interview-ui')).not.toBeInTheDocument();
    });

    it('should default to TextInterviewUI when no mode parameter is provided', () => {
      // Arrange: Mock search params to return no mode parameter
      const mockSearchParams = createMockSearchParams(''); // Empty search params
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      // Act: Render the session page
      render(<SessionPage />);

      // Assert: Should default to TextInterviewUI
      expect(screen.getByTestId('text-interview-ui')).toBeInTheDocument();
      expect(screen.getByText(/Text Interview Mode/)).toBeInTheDocument();
      
      // Assert: Other modes should NOT be rendered
      expect(screen.queryByTestId('voice-interview-ui')).not.toBeInTheDocument();
      expect(screen.queryByText(/Avatar mode coming soon/)).not.toBeInTheDocument();
    });

    it('should default to TextInterviewUI when invalid mode parameter is provided', () => {
      // Arrange: Mock search params to return invalid mode
      const mockSearchParams = createMockSearchParams('mode=invalid-mode');
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      // Act: Render the session page
      render(<SessionPage />);

      // Assert: Should default to TextInterviewUI for invalid modes
      expect(screen.getByTestId('text-interview-ui')).toBeInTheDocument();
      expect(screen.getByText(/Text Interview Mode/)).toBeInTheDocument();
      
      // Assert: Other modes should NOT be rendered
      expect(screen.queryByTestId('voice-interview-ui')).not.toBeInTheDocument();
      expect(screen.queryByText(/Avatar mode coming soon/)).not.toBeInTheDocument();
    });
  });

  describe('🔴 RED: Common Elements Rendering', () => {
    it('should always render the timer component regardless of mode', () => {
      // Test with text mode
      const mockSearchParams = createMockSearchParams('mode=text');
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      render(<SessionPage />);
      expect(screen.getByTestId('timer')).toBeInTheDocument();
    });

    it('should pass correct sessionId to interview components', () => {
      // Arrange: Mock specific session ID
      mockUseParams.mockReturnValue({ id: 'specific-session-456' });
      const mockSearchParams = createMockSearchParams('mode=text');
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      // Act: Render the session page
      render(<SessionPage />);

      // Assert: Session ID should be passed correctly
      expect(screen.getByText(/Session: specific-session-456/)).toBeInTheDocument();
    });

    it('should handle array session IDs from params correctly', () => {
      // Arrange: Mock params returning array (edge case in Next.js routing)
      mockUseParams.mockReturnValue({ id: ['session', '789'] });
      const mockSearchParams = createMockSearchParams('mode=text');
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      // Act: Render the session page
      render(<SessionPage />);

      // Assert: Should handle array by taking first element
      expect(screen.getByText(/Session: session/)).toBeInTheDocument();
    });
  });

  describe('🔴 RED: URL Parameter Integration', () => {
    it('should handle multiple URL parameters correctly', () => {
      // Arrange: Mock search params with multiple parameters
      const mockSearchParams = createMockSearchParams('mode=voice&debug=true&theme=dark');
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      // Act: Render the session page
      render(<SessionPage />);

      // Assert: Should extract mode correctly even with other params
      expect(screen.getByTestId('voice-interview-ui')).toBeInTheDocument();
    });

    it('should be case-sensitive for mode parameter values', () => {
      // Arrange: Mock search params with uppercase mode
      const mockSearchParams = createMockSearchParams('mode=TEXT');
      mockUseSearchParams.mockReturnValue(mockSearchParams);

      // Act: Render the session page
      render(<SessionPage />);

      // Assert: Should default to text mode since 'TEXT' !== 'text'
      expect(screen.getByTestId('text-interview-ui')).toBeInTheDocument();
    });
  });
}); 