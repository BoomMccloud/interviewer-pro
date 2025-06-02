/**
 * @fileoverview Minimal Behavior Tests for VoiceInterviewUI Component
 * 
 * TESTING STRATEGY: Focus on stable business logic for voice interaction
 * ✅ Voice recording workflow - start/stop/process states
 * ✅ User workflows - recording submission, retry, clear
 * ✅ Component APIs - props interface and state management
 * ✅ Error handling - microphone permissions, network failures
 * ❌ Avoid: Specific styling, exact UI structure, visual details
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Import the component for testing
import VoiceInterviewUI from '~/components/Sessions/InterviewUI/VoiceInterviewUI';

// Mock Web APIs that aren't available in test environment
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  state: 'inactive',
  stream: {} as MediaStream,
};

// Mock getUserMedia
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(),
  },
  writable: true,
});

// Mock MediaRecorder
global.MediaRecorder = jest.fn().mockImplementation(() => mockMediaRecorder) as unknown as typeof MediaRecorder;
Object.defineProperty(global.MediaRecorder, 'isTypeSupported', {
  value: jest.fn().mockReturnValue(true),
});

// Mock session data structure
const mockSessionData = {
  sessionId: 'test-session-123',
  isActive: true,
  personaId: 'technical-interviewer',
  currentQuestion: 'Tell me about your experience with React.',
  conversationHistory: [],
  questionNumber: 1,
  timeRemaining: 1800
};

describe('VoiceInterviewUI - Minimal Behavior Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMediaRecorder.state = 'inactive';
  });

  describe('🔴 RED: Component API and Props', () => {
    it('should accept required sessionData props', () => {
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      // Component should render without errors - look for question text
      expect(screen.getByText('Test question')).toBeInTheDocument();
    });

    it('should display current question prominently', () => {
      const testQuestion = 'Describe your leadership experience.';
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: testQuestion,
        isProcessingResponse: false,
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      // Should display the current question
      expect(screen.getByText(testQuestion)).toBeInTheDocument();
    });

    it('should show voice-specific UI elements', () => {
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      // Should have voice recording controls
      expect(screen.getByRole('button', { name: /start.*recording|record/i })).toBeInTheDocument();
    });
  });

  describe('🔴 RED: Voice Recording Workflow', () => {
    it('should start recording when record button is clicked', async () => {
      const user = userEvent.setup();
      const mockGetUserMedia = jest.fn().mockResolvedValue({} as MediaStream);
      (navigator.mediaDevices.getUserMedia as jest.Mock) = mockGetUserMedia;

      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      const recordButton = screen.getByRole('button', { name: /start.*recording|record/i });
      await user.click(recordButton);

      // Should request microphone permission and start recording
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    it('should stop recording when stop button is clicked', async () => {
      const user = userEvent.setup();
      mockMediaRecorder.state = 'recording';

      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      // Simulate recording state - should show stop button
      const stopButton = screen.getByRole('button', { name: /stop.*recording|stop/i });
      await user.click(stopButton);

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should show recording duration during active recording', async () => {
      mockMediaRecorder.state = 'recording';

      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      // Should show recording duration indicator
      expect(screen.getByText(/recording|duration|\d+:\d+/i)).toBeInTheDocument();
    });

    it('should handle audio data after recording stops', async () => {
      const mockOnSendVoiceInput = jest.fn();
      const user = userEvent.setup();
      
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendVoiceInput: mockOnSendVoiceInput,
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);

      // Start recording first
      const recordButton = screen.getByRole('button', { name: /start.*recording|record/i });
      await user.click(recordButton);

      // Stop recording to get the submit button
      const stopButton = screen.getByRole('button', { name: /stop.*recording|stop/i });
      await user.click(stopButton);

      // Now find and click submit button for recorded audio
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /send.*recording|send/i });
        expect(submitButton).toBeInTheDocument();
      });
      
      const submitButton = screen.getByRole('button', { name: /send.*recording|send/i });
      await user.click(submitButton);

      // Should call callback with voice data
      expect(mockOnSendVoiceInput).toHaveBeenCalled();
    });
  });

  describe('🔴 RED: Recording State Management', () => {
    it('should disable recording controls during processing', () => {
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: true, // Processing state
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      const recordButton = screen.getByRole('button', { name: /start.*recording|record/i });
      
      // Recording controls should be disabled during processing
      expect(recordButton).toBeDisabled();
    });

    it('should show processing indicator when AI is preparing response', () => {
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: true,
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      // Should show processing/transcription indicator
      expect(screen.getByText(/processing|transcribing|preparing/i)).toBeInTheDocument();
    });

    it('should allow re-recording if user is not satisfied', async () => {
      const user = userEvent.setup();
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      // Start recording first
      const recordButton = screen.getByRole('button', { name: /start.*recording|record/i });
      await user.click(recordButton);

      // Stop recording to get stopped state
      const stopButton = screen.getByRole('button', { name: /stop.*recording|stop/i });
      await user.click(stopButton);

      // After recording, should have option to re-record
      await waitFor(() => {
        const reRecordButton = screen.getByRole('button', { name: /try.*again|record.*again/i });
        expect(reRecordButton).toBeInTheDocument();
      });

      const reRecordButton = screen.getByRole('button', { name: /try.*again|record.*again/i });
      await user.click(reRecordButton);

      // Should reset to initial recording state
      expect(screen.getByRole('button', { name: /start.*recording|record/i })).toBeInTheDocument();
    });

    it('should display conversation history for context', () => {
      const conversationHistory = [
        {
          role: 'ai' as const,
          content: 'Welcome to the interview.',
          timestamp: new Date().toISOString(),
        },
        {
          role: 'user' as const,
          content: 'Thank you, I\'m ready to start.',
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
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      // Should display previous conversation context
      expect(screen.getByText('Welcome to the interview.')).toBeInTheDocument();
      expect(screen.getByText('Thank you, I\'m ready to start.')).toBeInTheDocument();
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
        onSendVoiceInput: jest.fn(),
        onPause: mockOnPause,
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
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
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: mockOnEnd,
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      const endButton = screen.getByRole('button', { name: /end.*interview/i });
      await user.click(endButton);

      expect(mockOnEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('🔴 RED: Error Handling', () => {
    it('should handle microphone permission denial gracefully', async () => {
      const user = userEvent.setup();
      const mockGetUserMedia = jest.fn().mockRejectedValue(new Error('Permission denied'));
      (navigator.mediaDevices.getUserMedia as jest.Mock) = mockGetUserMedia;

      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      const recordButton = screen.getByRole('button', { name: /start.*recording|record/i });
      await user.click(recordButton);

      // Should show error message about microphone access
      await waitFor(() => {
        // Use getAllByText to handle multiple instances and pick one
        const errorMessages = screen.getAllByText(/microphone.*permission|access.*denied|enable.*microphone/i);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it('should handle voice processing errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnSendVoiceInput = jest.fn().mockRejectedValue(new Error('Transcription failed'));
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendVoiceInput: mockOnSendVoiceInput,
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      // Start and stop recording to get the submit button
      const recordButton = screen.getByRole('button', { name: /start.*recording|record/i });
      await user.click(recordButton);
      
      const stopButton = screen.getByRole('button', { name: /stop.*recording|stop/i });
      await user.click(stopButton);

      // Wait for submit button to appear
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /send.*recording|send/i });
        expect(submitButton).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /send.*recording|send/i });
      await user.click(submitButton);

      // Component should not crash and allow retry
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try.*again|retry/i })).toBeInTheDocument();
      });
    });

    it('should provide fallback to text input if voice fails', () => {
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      // Should have option to switch to text if voice doesn't work
      expect(screen.getByRole('button', { name: /text.*mode|type.*response/i })).toBeInTheDocument();
    });
  });

  describe('🔴 RED: Accessibility and Voice Feedback', () => {
    it('should provide audio/visual feedback for recording state', () => {
      mockMediaRecorder.state = 'recording';

      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      // Should show visual recording indicator
      expect(screen.getByRole('status')).toBeInTheDocument(); // Live region for screen readers
    });

    it('should have proper ARIA labels for voice controls', () => {
      const mockProps = {
        sessionData: mockSessionData,
        currentQuestion: 'Test question',
        isProcessingResponse: false,
        onSendVoiceInput: jest.fn(),
        onPause: jest.fn(),
        onEnd: jest.fn(),
      };

      render(<VoiceInterviewUI {...mockProps} />);
      
      const recordButton = screen.getByRole('button', { name: /start.*recording|record/i });
      
      // Should have proper accessibility attributes
      expect(recordButton).toHaveAttribute('aria-label');
    });
  });
}); 