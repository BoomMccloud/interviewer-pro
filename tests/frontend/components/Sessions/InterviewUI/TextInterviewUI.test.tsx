/**
 * @fileoverview Frontend TDD Tests for TextInterviewUI Component - QuestionSegments Migration
 * 
 * TESTING STRATEGY: Focus on stable business logic, avoid design-dependent details
 * ✅ User workflows - core functionality that won't change
 * ✅ Data flow - API interactions and state management  
 * ✅ Component APIs - props interface and contracts
 * ❌ Avoid: Specific styling, exact UI structure, visual details
 * 
 * 🔴 RED PHASE: These tests expect the NEW QuestionSegments structure and will FAIL
 * until the component is migrated from the legacy 'history' field structure.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Import the component for testing
import TextInterviewUI from '~/components/Sessions/InterviewUI/TextInterviewUI';

// NEW: QuestionSegments-based mock data structure
const mockQuestionSegmentSessionData = {
  sessionId: 'test-session-123',
  history: [
    {
      role: 'ai' as const,
      content: 'Tell me about your background and experience.',
      timestamp: new Date(),
    },
    {
      role: 'user' as const,
      content: 'I have 5 years of experience in software development.',
      timestamp: new Date(),
    },
  ],
  currentQuestion: 'What are your greatest strengths?',
  keyPoints: [
    'Focus on technical skills relevant to the role',
    'Provide specific examples and metrics',
    'Connect strengths to business value',
  ],
  status: 'active' as const,
  startTime: new Date(),
  personaName: 'Technical Interviewer',
};

// NEW: Expected props interface for QuestionSegments structure
interface ExpectedTextInterviewUIProps {
  sessionData: {
    sessionId: string;
    history: Array<{
      role: 'user' | 'ai';  // Changed from 'model' to 'ai'
      content: string;      // Changed from 'text' to 'content'
      timestamp: Date;
    }>;
    currentQuestion: string;
    keyPoints: string[];
    status: 'active' | 'paused' | 'completed';
    startTime: Date;
    personaName?: string;
  };
  userInput: string;
  setUserInput: (input: string) => void;
  onSubmitResponse: (response: string) => Promise<void>;
  isLoading: boolean;
  onGetNextTopic?: () => Promise<void>;
  isGettingNextTopic?: boolean;
  onSave?: () => Promise<void>;
  onEnd?: () => Promise<void>;
  isSaving?: boolean;
  isEnding?: boolean;
}

describe('TextInterviewUI - QuestionSegments Migration TDD', () => {
  describe('🔴 RED: Component API and Props - QuestionSegments Structure', () => {
    it('should accept sessionData with new role and content field names', () => {
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: false,
      };

      // This will FAIL until component is migrated to expect 'ai' role and 'content' field
      render(<TextInterviewUI {...mockProps} />);
      
      // Component should render without errors - look for question text
      expect(screen.getByText('What are your greatest strengths?')).toBeInTheDocument();
    });

    it('should display conversation history with ai/user roles instead of model/user', () => {
      const sessionDataWithConversation = {
        ...mockQuestionSegmentSessionData,
        history: [
          {
            role: 'ai' as const,
            content: 'Welcome! Let\'s start the interview.',
            timestamp: new Date(),
          },
          {
            role: 'user' as const,
            content: 'Thank you, I\'m ready to begin.',
            timestamp: new Date(),
          },
          {
            role: 'ai' as const,
            content: 'Great! Tell me about your background.',
            timestamp: new Date(),
          }
        ],
      };

      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: sessionDataWithConversation,
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: false,
      };

      // This will FAIL until component migrates from 'model' to 'ai' role handling
      render(<TextInterviewUI {...mockProps} />);
      
      // Should display conversation history with new role structure
      expect(screen.getByText('Welcome! Let\'s start the interview.')).toBeInTheDocument();
      expect(screen.getByText('Thank you, I\'m ready to begin.')).toBeInTheDocument();
      expect(screen.getByText('Great! Tell me about your background.')).toBeInTheDocument();
    });

    it('should display keyPoints from QuestionSegments structure', () => {
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: false,
      };

      // This should work if keyPoints display is already implemented
      render(<TextInterviewUI {...mockProps} />);
      
      // Should display the key points from the new structure
      expect(screen.getByText('Focus on technical skills relevant to the role')).toBeInTheDocument();
      expect(screen.getByText('Provide specific examples and metrics')).toBeInTheDocument();
      expect(screen.getByText('Connect strengths to business value')).toBeInTheDocument();
    });

    it('should handle empty conversation history gracefully', () => {
      const sessionDataWithEmptyHistory = {
        ...mockQuestionSegmentSessionData,
        history: [], // Empty array
      };

      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: sessionDataWithEmptyHistory,
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: false,
      };

      // Should not throw error with empty conversation history
      expect(() => render(<TextInterviewUI {...mockProps} />)).not.toThrow();
      
      // Should show empty state message
      expect(screen.getByText(/conversation history will appear here/i)).toBeInTheDocument();
    });
  });

  describe('🔴 RED: User Workflow - Message Submission with QuestionSegments', () => {
    it('should allow user to type and submit a message', async () => {
      const user = userEvent.setup();
      const mockOnSubmitResponse = jest.fn().mockResolvedValue(undefined);
      const mockSetUserInput = jest.fn();
      
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: 'This is my test response',  // Set userInput directly in props
        setUserInput: mockSetUserInput,
        onSubmitResponse: mockOnSubmitResponse,
        isLoading: false,
      };

      render(<TextInterviewUI {...mockProps} />);
      
      // Find submit button
      const submitButton = screen.getByRole('button', { name: /send/i });

      // User submits the message (input is already in userInput prop)
      await user.click(submitButton);

      // Should call onSubmitResponse with the typed content
      expect(mockOnSubmitResponse).toHaveBeenCalledWith('This is my test response');
    });

    it('should not submit empty messages', async () => {
      const user = userEvent.setup();
      const mockOnSubmitResponse = jest.fn();
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: mockOnSubmitResponse,
        isLoading: false,
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const submitButton = screen.getByRole('button', { name: /send/i });

      // Try to submit without typing anything
      await user.click(submitButton);

      // Should not call onSubmitResponse for empty input
      expect(mockOnSubmitResponse).not.toHaveBeenCalled();
    });

    it('should clear input after successful submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmitResponse = jest.fn().mockResolvedValue(undefined);
      const mockSetUserInput = jest.fn();
      
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: 'Test message',
        setUserInput: mockSetUserInput,
        onSubmitResponse: mockOnSubmitResponse,
        isLoading: false,
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const submitButton = screen.getByRole('button', { name: /send/i });

      // Submit message
      await user.click(submitButton);

      // Should call setUserInput with empty string to clear input
      await waitFor(() => {
        expect(mockSetUserInput).toHaveBeenCalledWith('');
      });
    });
  });

  describe('🔴 RED: State Management - Processing States', () => {
    it('should disable submission during processing', () => {
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: 'Some text',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: true, // Processing state
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      
      // Submit button should be disabled during processing
      expect(submitButton).toBeDisabled();
    });

    it('should show processing indicator when isLoading is true', () => {
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: true,
      };

      render(<TextInterviewUI {...mockProps} />);
      
      // Should show loading indicator in the chat area (more specific selector)
      expect(screen.getByText('AI is preparing next question...')).toBeInTheDocument();
    });

    it('should display conversation with new ai/user role structure', () => {
      const conversationHistory = [
        {
          role: 'ai' as const,
          content: 'Hello, let\'s start the interview.',
          timestamp: new Date(),
        },
        {
          role: 'user' as const,
          content: 'I\'m ready to begin.',
          timestamp: new Date(),
        }
      ];

      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: {
          ...mockQuestionSegmentSessionData,
          history: conversationHistory,
        },
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: false,
      };

      // This will FAIL until component migrates from 'model' to 'ai' role handling
      render(<TextInterviewUI {...mockProps} />);
      
      // Should display conversation history with new role types
      expect(screen.getByText('Hello, let\'s start the interview.')).toBeInTheDocument();
      expect(screen.getByText('I\'m ready to begin.')).toBeInTheDocument();
    });
  });

  describe('🔴 RED: Session Control Actions - QuestionSegments Features', () => {
    it('should call onGetNextTopic when next question button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnGetNextTopic = jest.fn();
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: false,
        onGetNextTopic: mockOnGetNextTopic,
        isGettingNextTopic: false,
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const nextTopicButton = screen.getByRole('button', { name: /next question/i });
      await user.click(nextTopicButton);

      expect(mockOnGetNextTopic).toHaveBeenCalledTimes(1);
    });

    it('should call onSave when save action is triggered', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn();
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: false,
        onSave: mockOnSave,
        isSaving: false,
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    it('should call onEnd when end interview action is triggered', async () => {
      const user = userEvent.setup();
      const mockOnEnd = jest.fn();
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: false,
        onEnd: mockOnEnd,
        isEnding: false,
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const endButton = screen.getByRole('button', { name: /end.*interview/i });
      await user.click(endButton);

      expect(mockOnEnd).toHaveBeenCalledTimes(1);
    });

    it('should disable next topic button when isGettingNextTopic is true', () => {
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: false,
        onGetNextTopic: jest.fn(),
        isGettingNextTopic: true, // Loading state
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const nextTopicButton = screen.getByRole('button', { name: /getting next question/i });
      
      // Should be disabled during loading
      expect(nextTopicButton).toBeDisabled();
    });
  });

  describe('🔴 RED: Keyboard Shortcuts', () => {
    it('should submit message when Ctrl+Enter is pressed', async () => {
      const user = userEvent.setup();
      const mockOnSubmitResponse = jest.fn();
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: 'Quick message via shortcut',
        setUserInput: jest.fn(),
        onSubmitResponse: mockOnSubmitResponse,
        isLoading: false,
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const messageInput = screen.getByRole('textbox');
      
      // Focus on input and use keyboard shortcut
      await user.click(messageInput);
      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(mockOnSubmitResponse).toHaveBeenCalledWith('Quick message via shortcut');
    });
  });

  describe('🔴 RED: Error Handling', () => {
    it('should handle onSubmitResponse errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnSubmitResponse = jest.fn().mockRejectedValue(new Error('Network error'));
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: mockQuestionSegmentSessionData,
        userInput: 'This will fail',
        setUserInput: jest.fn(),
        onSubmitResponse: mockOnSubmitResponse,
        isLoading: false,
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const submitButton = screen.getByRole('button', { name: /send/i });

      await user.click(submitButton);

      // Component should not crash on error
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should handle missing optional props gracefully', () => {
      const minimalProps: ExpectedTextInterviewUIProps = {
        sessionData: {
          sessionId: 'test-session',
          history: [],
          currentQuestion: 'Test question',
          keyPoints: [],
          status: 'active',
          startTime: new Date(),
        },
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: false,
        // All optional props omitted
      };

      // Should render without optional props
      expect(() => render(<TextInterviewUI {...minimalProps} />)).not.toThrow();
      
      // Should still show core functionality
      expect(screen.getByText('Test question')).toBeInTheDocument();
    });
  });

  describe('🔴 RED: Persona Integration', () => {
    it('should display persona name when provided', () => {
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: {
          ...mockQuestionSegmentSessionData,
          personaName: 'Senior Software Engineer',
        },
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: false,
      };

      render(<TextInterviewUI {...mockProps} />);
      
      // Should display the persona name
      expect(screen.getByText(/senior software engineer/i)).toBeInTheDocument();
    });

    it('should handle missing persona name gracefully', () => {
      const mockProps: ExpectedTextInterviewUIProps = {
        sessionData: {
          ...mockQuestionSegmentSessionData,
          personaName: undefined,
        },
        userInput: '',
        setUserInput: jest.fn(),
        onSubmitResponse: jest.fn(),
        isLoading: false,
      };

      // Should render without persona name
      expect(() => render(<TextInterviewUI {...mockProps} />)).not.toThrow();
    });
  });
}); 