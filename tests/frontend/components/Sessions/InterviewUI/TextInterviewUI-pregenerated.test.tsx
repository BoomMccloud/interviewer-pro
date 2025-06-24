/**
 * 🔴 RED: Isolated component test for progress indicator
 * 
 * FILES UNDER TEST:
 * - src/components/Sessions/InterviewUI/TextInterviewUI.tsx (MODIFY: Add questionNumber, totalQuestions props)
 * - src/components/Sessions/InterviewUI/TextInterviewUI.tsx (MODIFY: Progress indicator UI element)
 * - src/components/Sessions/InterviewUI/TextInterviewUI.tsx (MODIFY: Button text from "Get Next Topic" to "Next Question")
 * - src/types/index.ts (MODIFY: TextInterviewUIProps interface to include progress props)
 * 
 * PURPOSE: Test the UI component changes for displaying progress indicators
 * and modified button behavior. These are isolated component tests without tRPC hooks.
 * 
 * Following project pattern: Jest/RTL only for components WITHOUT tRPC hooks
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextInterviewUI from '~/components/Sessions/InterviewUI/TextInterviewUI';
import type { ConversationMessage } from '~/types';

describe('🔴 RED: TextInterviewUI Progress Indicators (src/components/Sessions/InterviewUI/TextInterviewUI.tsx)', () => {
  
  const mockConversationHistory: ConversationMessage[] = [
    {
      role: 'ai',
      content: 'What is your experience with React?',
      timestamp: new Date('2024-01-01T10:00:00Z')
    }
  ];

  const mockSessionData = {
    sessionId: 'test-session-id',
    history: mockConversationHistory,
    currentQuestion: 'What is your experience with React and component architecture?',
    keyPoints: ['Component design patterns', 'State management approach', 'Performance considerations'],
    status: 'active' as const,
    startTime: new Date('2024-01-01T10:00:00Z'),
    personaName: 'Technical Lead'
  };

  const mockProps = {
    sessionData: mockSessionData,
    userInput: '',
    setUserInput: jest.fn(),
    onSubmitResponse: jest.fn(),
    isLoading: false,
    onMoveToNext: jest.fn(),
    isGettingNextTopic: false,
    onSave: jest.fn(),
    onEnd: jest.fn(),
    isSaving: false,
    isEnding: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Progress Indicator Display', () => {
    it('should display progress indicator when questionNumber and totalQuestions provided', () => {
      // 🔴 This test WILL FAIL - progress indicator props don't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - NEW progress props
      
      render(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={2}
          totalQuestions={3}
        />
      );

      // Should show current progress
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
      
      // Progress should be prominently displayed
      const progressElement = screen.getByText('Question 2 of 3');
      expect(progressElement).toBeVisible();
    });

    it('should handle different progress states correctly', () => {
      // 🔴 This test WILL FAIL - progress prop handling doesn't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - progress state variations
      
      const { rerender } = render(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={1}
          totalQuestions={3}
        />
      );

      expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();

      // Test question 3 of 3
      rerender(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={3}
          totalQuestions={3}
        />
      );

      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument();
    });

    it('should not display progress when props are not provided', () => {
      // 🔴 This test WILL FAIL - conditional rendering logic doesn't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - optional progress display
      
      render(<TextInterviewUI {...mockProps} />);

      // Should not show progress indicator
      expect(screen.queryByText(/Question \d+ of \d+/)).not.toBeInTheDocument();
    });

    it('should handle edge cases for progress display', () => {
      // 🔴 This test WILL FAIL - edge case handling doesn't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - edge cases
      
      // Test with questionNumber but no totalQuestions
      const { rerender } = render(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={2}
        />
      );

      expect(screen.queryByText(/Question \d+ of \d+/)).not.toBeInTheDocument();

      // Test with totalQuestions but no questionNumber
      rerender(
        <TextInterviewUI 
          {...mockProps}
          totalQuestions={3}
        />
      );

      expect(screen.queryByText(/Question \d+ of \d+/)).not.toBeInTheDocument();
    });
  });

  describe('Button Text Changes', () => {
    it('should show "Next Question" button instead of "Get Next Topic"', () => {
      // 🔴 This test WILL FAIL - button text change doesn't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - button text modification
      
      render(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={1}
          totalQuestions={3}
        />
      );

      // Should show new button text
      expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();
      
      // Should NOT show old button text
      expect(screen.queryByRole('button', { name: /get next topic/i })).not.toBeInTheDocument();
    });

    it('should maintain "Next Question" text across different progress states', () => {
      // 🔴 This test WILL FAIL - consistent button text doesn't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - button text consistency
      
      const { rerender } = render(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={1}
          totalQuestions={3}
        />
      );

      expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();

      // Test on question 2
      rerender(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={2}
          totalQuestions={3}
        />
      );

      expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();
      
      // Test on final question
      rerender(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={3}
          totalQuestions={3}
        />
      );

      expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();
    });

    it('should handle button text when no progress props provided', () => {
      // 🔴 This test WILL FAIL - fallback button text handling doesn't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - button text fallback
      
      render(<TextInterviewUI {...mockProps} />);

      // Should show new button text even without progress props
      expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /get next topic/i })).not.toBeInTheDocument();
    });
  });

  describe('Button Behavior', () => {
    it('should call onMoveToNext when Next Question button clicked', async () => {
      // 🔴 This test WILL FAIL - button behavior change doesn't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - onMoveToNext handler
      
      const mockOnMoveToNext = jest.fn();
      
      render(
        <TextInterviewUI 
          {...mockProps}
          onMoveToNext={mockOnMoveToNext}
          questionNumber={1}
          totalQuestions={3}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next question/i });
      await userEvent.click(nextButton);

      expect(mockOnMoveToNext).toHaveBeenCalledTimes(1);
    });

    it('should disable button during loading states', async () => {
      // 🔴 This test WILL FAIL - button state management doesn't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - button disabled states
      
      const { rerender } = render(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={1}
          totalQuestions={3}
          isGettingNextTopic={true}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next question/i });
      expect(nextButton).toBeDisabled();

      // Test when not loading
      rerender(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={1}
          totalQuestions={3}
          isGettingNextTopic={false}
        />
      );

      expect(nextButton).not.toBeDisabled();
    });

    it('should handle button interaction with different progress states', async () => {
      // 🔴 This test WILL FAIL - progress-aware button behavior doesn't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - button behavior with progress
      
      const mockOnMoveToNext = jest.fn();
      
      const { rerender } = render(
        <TextInterviewUI 
          {...mockProps}
          onMoveToNext={mockOnMoveToNext}
          questionNumber={2}
          totalQuestions={3}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next question/i });
      await userEvent.click(nextButton);

      expect(mockOnMoveToNext).toHaveBeenCalledTimes(1);

      // Test on final question
      rerender(
        <TextInterviewUI 
          {...mockProps}
          onMoveToNext={mockOnMoveToNext}
          questionNumber={3}
          totalQuestions={3}
        />
      );

      await userEvent.click(nextButton);
      expect(mockOnMoveToNext).toHaveBeenCalledTimes(2);
    });
  });

  describe('UI Layout and Styling', () => {
    it('should position progress indicator prominently', () => {
      // 🔴 This test WILL FAIL - progress indicator styling doesn't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - progress indicator layout
      
      render(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={1}
          totalQuestions={3}
        />
      );

      const progressElement = screen.getByText('Question 1 of 3');
      
      // Should be visible and accessible
      expect(progressElement).toBeVisible();
      
      // Should have appropriate role for accessibility
      expect(progressElement).toHaveAttribute('aria-label', 'Interview progress');
    });

    it('should maintain existing layout with new progress element', () => {
      // 🔴 This test WILL FAIL - layout integration doesn't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - layout preservation
      
      render(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={2}
          totalQuestions={3}
        />
      );

      // Existing elements should still be present
      expect(screen.getByText(mockSessionData.currentQuestion)).toBeInTheDocument();
      expect(screen.getByText('Technical Lead')).toBeInTheDocument();
      
      // Key points should still be displayed
      mockSessionData.keyPoints.forEach(keyPoint => {
        expect(screen.getByText(keyPoint)).toBeInTheDocument();
      });

      // Progress should be additional, not replacing existing content
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
    });
  });

  describe('TypeScript Interface Compliance', () => {
    it('should accept new optional props without breaking existing usage', () => {
      // 🔴 This test WILL FAIL - interface updates don't exist yet
      // Testing: src/types/index.ts - TextInterviewUIProps interface modifications
      
      // Should work with new props
      const withProgressProps = {
        ...mockProps,
        questionNumber: 1,
        totalQuestions: 3
      };

      expect(() => render(<TextInterviewUI {...withProgressProps} />)).not.toThrow();

      // Should work without new props (backward compatibility)
      expect(() => render(<TextInterviewUI {...mockProps} />)).not.toThrow();
    });

    it('should handle type-safe prop validation', () => {
      // 🔴 This test WILL FAIL - prop validation doesn't exist yet
      // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - prop validation
      
      // Should handle valid number props
      expect(() => render(
        <TextInterviewUI 
          {...mockProps}
          questionNumber={1}
          totalQuestions={3}
        />
      )).not.toThrow();

      // Note: TypeScript compile-time validation would catch invalid types
      // This test mainly ensures runtime behavior is correct
    });
  });
}); 