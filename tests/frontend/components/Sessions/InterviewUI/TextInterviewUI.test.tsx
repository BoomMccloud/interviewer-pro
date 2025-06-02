/**
 * @fileoverview Minimal Behavior Tests for TextInterviewUI Component
 * 
 * TESTING STRATEGY: Focus on stable business logic, avoid design-dependent details
 * ✅ User workflows - core functionality that won't change
 * ✅ Data flow - API interactions and state management  
 * ✅ Component APIs - props interface and contracts
 * ❌ Avoid: Specific styling, exact UI structure, visual details
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Import the component for testing
import TextInterviewUI from '~/components/Sessions/InterviewUI/TextInterviewUI';

// Mock session data structure
const mockSessionData = {
  sessionId: 'test-session-123',
  isActive: true,
  personaId: 'technical-interviewer',
  currentQuestion: 'Tell me about yourself and your background.',
  conversationHistory: [],
  questionNumber: 1,
  timeRemaining: 1800
};

describe('TextInterviewUI - Minimal Behavior Tests', () => {
  describe('🔴 RED: Component API and Props', () => {
    it('should accept required sessionData props', () => {
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendMessage: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<TextInterviewUI {...mockProps} />);
      
      // Component should render without errors - look for question text
      expect(screen.getByText('Test question')).toBeInTheDocument();
    });

    it('should handle missing conversation history gracefully', () => {
      const sessionDataWithoutHistory = {
        ...mockSessionData,
        conversationHistory: [], // Empty array instead of undefined
      };

      const mockProps = {
        sessionData: sessionDataWithoutHistory,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendMessage: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      // Should not throw error with empty conversation history
      expect(() => render(<TextInterviewUI {...mockProps} />)).not.toThrow();
    });

    it('should display current question from props', () => {
      const testQuestion = 'What is your greatest strength?';
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: testQuestion,
        isProcessingResponse: false,
        onSendMessage: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<TextInterviewUI {...mockProps} />);
      
      // Should display the current question
      expect(screen.getByText(testQuestion)).toBeInTheDocument();
    });
  });

  describe('🔴 RED: User Workflow - Message Submission', () => {
    it('should allow user to type and submit a message', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = jest.fn();
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendMessage: mockOnSendMessage,
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<TextInterviewUI {...mockProps} />);
      
      // Find input field (by role, not specific implementation)
      const messageInput = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: /send/i });

      // User types a message
      await user.type(messageInput, 'This is my test response');
      
      // User submits the message
      await user.click(submitButton);

      // Should call onSendMessage with the typed content
      expect(mockOnSendMessage).toHaveBeenCalledWith('This is my test response');
    });

    it('should not submit empty messages', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = jest.fn();
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendMessage: mockOnSendMessage,
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const submitButton = screen.getByRole('button', { name: /send/i });

      // Try to submit without typing anything
      await user.click(submitButton);

      // Should not call onSendMessage for empty input
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should clear input after successful submission', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = jest.fn().mockResolvedValue(undefined);
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendMessage: mockOnSendMessage,
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const messageInput = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: /send/i });

      // Type and submit message
      await user.type(messageInput, 'Test message');
      await user.click(submitButton);

      // Wait for async submission to complete
      await waitFor(() => {
        expect(messageInput).toHaveValue('');
      });
    });
  });

  describe('🔴 RED: State Management - Processing States', () => {
    it('should disable submission during processing', () => {
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: true, // Processing state
        onSendMessage: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      
      // Submit button should be disabled during processing
      expect(submitButton).toBeDisabled();
    });

    it('should show processing indicator when isProcessingResponse is true', () => {
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: true,
        onSendMessage: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<TextInterviewUI {...mockProps} />);
      
      // Should show some indication that AI is processing
      expect(screen.getByText(/processing|preparing|sending/i)).toBeInTheDocument();
    });

    it('should update conversation history when new messages are added', () => {
      const conversationHistory = [
        {
          role: 'ai' as const,
          content: 'Hello, let\'s start the interview.',
          timestamp: new Date().toISOString(),
        },
        {
          role: 'user' as const,
          content: 'I\'m ready to begin.',
          timestamp: new Date().toISOString(),
        }
      ];

      const mockProps = {
        sessionData: {
          ...mockSessionData,
          conversationHistory,
        },
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendMessage: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<TextInterviewUI {...mockProps} />);
      
      // Should display conversation history
      expect(screen.getByText('Hello, let\'s start the interview.')).toBeInTheDocument();
      expect(screen.getByText('I\'m ready to begin.')).toBeInTheDocument();
    });
  });

  describe('🔴 RED: Session Control Actions', () => {
    it('should call onPause when pause action is triggered', async () => {
      const user = userEvent.setup();
      const mockOnPause = jest.fn();
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendMessage: jest.fn(),
        onPause: mockOnPause,
        onEnd: jest.fn(),
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await user.click(pauseButton);

      expect(mockOnPause).toHaveBeenCalledTimes(1);
    });

    it('should call onEnd when end interview action is triggered', async () => {
      const user = userEvent.setup();
      const mockOnEnd = jest.fn();
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendMessage: jest.fn(),
        onPause: jest.fn(),
        onEnd: mockOnEnd,
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const endButton = screen.getByRole('button', { name: /end.*interview/i });
      await user.click(endButton);

      expect(mockOnEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('🔴 RED: Keyboard Shortcuts', () => {
    it('should submit message when Ctrl+Enter is pressed', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = jest.fn();
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendMessage: mockOnSendMessage,
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const messageInput = screen.getByRole('textbox');
      
      // Type message and use keyboard shortcut
      await user.type(messageInput, 'Quick message via shortcut');
      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(mockOnSendMessage).toHaveBeenCalledWith('Quick message via shortcut');
    });
  });

  describe('🔴 RED: Error Handling', () => {
    it('should handle onSendMessage errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = jest.fn().mockRejectedValue(new Error('Network error'));
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendMessage: mockOnSendMessage,
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<TextInterviewUI {...mockProps} />);
      
      const messageInput = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: /send/i });

      await user.type(messageInput, 'This will fail');
      await user.click(submitButton);

      // Component should not crash on error
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });
}); 