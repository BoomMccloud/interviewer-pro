/**
 * RED Test – VoiceInterviewUI recording behaviour
 * ------------------------------------------------
 * This Jest + React Testing Library spec captures the desired hands-free
 * behaviour for Phase-2. It is expected to FAIL until the component is
 * updated to auto-start recording and emit the onSendVoiceInput callback
 * after end-of-speech.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// NOTE: Direct import rather than alias to keep the path explicit for now.
import VoiceInterviewUI from '../../../src/components/Sessions/InterviewUI/VoiceInterviewUI';

// Mock Next.js router for React Testing Library environment
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

// Mock the openLiveInterviewSession helper
const mockStopTurn = jest.fn();
const mockClose = jest.fn();

// Avoid temporal dead-zone by referencing the mocks lazily inside wrapper fns
jest.mock('~/lib/gemini', () => {
  const listeners: Record<string, ((payload: any) => void)[]> = {};
  const session = {
    sendAudioChunk: jest.fn(),
    stopTurn: (...args: any[]) => mockStopTurn(...args),
    close: (...args: any[]) => mockClose(...args),
    on: (event: string, cb: (payload: any) => void) => {
      (listeners[event] ||= []).push(cb);
    },
  };
  return {
    openLiveInterviewSession: jest.fn().mockResolvedValue(session),
    __emit: (event: string, payload: any) => {
      (listeners[event] || []).forEach((cb) => cb(payload));
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __emit } = require('~/lib/gemini');

// Clear mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});

describe('VoiceInterviewUI – hands-free recording flow', () => {
  /**
   * Provide minimal stubs for MediaRecorder + getUserMedia so the component
   * can mount in JSDOM. These are *not* production-ready mocks – they only
   * exist to let the failing expectation compile.
   */
  beforeAll(() => {
    // jsdom lacks WebRTC types. Define a minimal shim so our code that
    // instantiates `new MediaStream()` doesn't crash.
    class FakeMediaStream {
      // eslint-disable-next-line class-methods-use-this
      getTracks() {
        return [];
      }
    }
    // Expose shim on global scope for the test runtime
    global.MediaStream = FakeMediaStream as unknown as typeof MediaStream;

    // Mock getUserMedia to resolve with our fake stream
    // @ts-expect-error – jsdom doesn't have mediaDevices; we inject it.
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(new FakeMediaStream()),
    } as unknown;

    // Basic stub for the MediaRecorder constructor & API.
    // When stop() is called we synchronously fire the onstop handler and
    // supply a dummy Blob via ondataavailable.
    class FakeRecorder {
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      state: 'recording' = 'recording';
      start = jest.fn();
      stop = jest.fn().mockImplementation(() => {
        if (this.ondataavailable) {
          const blob = new Blob(['dummy'], { type: 'audio/webm' });
          this.ondataavailable({ data: blob });
        }
        if (this.onstop) this.onstop();
        this.state = 'inactive';
      });
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      constructor() {}
    }
    // @ts-expect-error – override global
    global.MediaRecorder = FakeRecorder;
  });

  it('auto-starts recording and shows "Recording…" status', async () => {
    const onSendVoiceInput = jest.fn();

    const dummySessionData = {
      sessionId: 'test-session',
      isActive: true,
      personaId: 'swe-standard',
      currentQuestion: 'Tell me about yourself.',
      conversationHistory: [],
      questionNumber: 1,
      timeRemaining: 600,
      startTime: null,
    };

    await act(async () => {
      render(
        <VoiceInterviewUI
          sessionData={dummySessionData as any}
          currentQuestion="Tell me about yourself."
          keyPoints={[]}
          isProcessingResponse={false}
          onSendVoiceInput={onSendVoiceInput}
          onPause={jest.fn()}
          onEnd={jest.fn()}
        />,
      );
    });

    // ASSERT – user should immediately see the status text "Recording...".
    // This will fail until the component auto-starts recording; button labels like
    // "Start recording" must NOT satisfy this stricter regex.
    expect(screen.getByText(/Recording\.\.\./i)).toBeInTheDocument();
  });

  it('calls onSendVoiceInput with the audio blob when recording stops', async () => {
    const onSendVoiceInput = jest.fn().mockResolvedValue(undefined);

    const dummySessionData = {
      sessionId: 'test-session',
      isActive: true,
      personaId: 'swe-standard',
      currentQuestion: 'Explain closures.',
      conversationHistory: [],
      questionNumber: 2,
      timeRemaining: 600,
      startTime: null,
    };

    await act(async () => {
      render(
        <VoiceInterviewUI
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sessionData={dummySessionData as any}
          currentQuestion="Explain closures."
          keyPoints={[]}
          isProcessingResponse={false}
          onSendVoiceInput={onSendVoiceInput}
          onPause={jest.fn()}
          onEnd={jest.fn()}
        />,
      );
    });

    // Simulate user clicking the big mic button to stop recording.
    const micButton = screen.getByRole('button', { name: /stop recording/i });
    await act(async () => {
      micButton.click();
    });

    // The fake MediaRecorder implementation triggers onstop synchronously,
    // so the callback should already have been invoked.
    expect(onSendVoiceInput).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const blobArg = onSendVoiceInput.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
  });

  it('renders socket-open indicator once Gemini session is ready', async () => {
    const onSendVoiceInput = jest.fn();
    const dummySessionData = {
      sessionId: 'test',
      isActive: true,
      personaId: 'swe',
      currentQuestion: 'Q1',
      conversationHistory: [],
      questionNumber: 1,
      timeRemaining: 600,
      startTime: null,
    };

    await act(async () => {
      render(
        <VoiceInterviewUI
          sessionData={dummySessionData as any}
          currentQuestion="Q1"
          keyPoints={[]}
          isProcessingResponse={false}
          onSendVoiceInput={onSendVoiceInput}
          onPause={jest.fn()}
          onEnd={jest.fn()}
        />,
      );
    });

    expect(await screen.findByTestId('socket-open')).toBeInTheDocument();
  });

  it('Next Question button calls stopTurn', async () => {
    const dummySessionData = {
      sessionId: 'test',
      isActive: true,
      personaId: 'swe',
      currentQuestion: 'Q1',
      conversationHistory: [],
      questionNumber: 1,
      timeRemaining: 600,
      startTime: null,
    };

    await act(async () => {
      render(
        <VoiceInterviewUI
          sessionData={dummySessionData as any}
          currentQuestion="Q1"
          keyPoints={[]}
          isProcessingResponse={false}
          onSendVoiceInput={jest.fn()}
          onPause={jest.fn()}
          onEnd={jest.fn()}
        />,
      );
    });

    const btn = await screen.findByTestId('next-question-btn');
    await act(async () => {
      btn.click();
    });

    expect(mockStopTurn).toHaveBeenCalled();
  });

  it('End Interview button calls close', async () => {
    const dummySessionData = {
      sessionId: 'test',
      isActive: true,
      personaId: 'swe',
      currentQuestion: 'Q1',
      conversationHistory: [],
      questionNumber: 1,
      timeRemaining: 600,
      startTime: null,
    };

    await act(async () => {
      render(
        <VoiceInterviewUI
          sessionData={dummySessionData as any}
          currentQuestion="Q1"
          keyPoints={[]}
          isProcessingResponse={false}
          onSendVoiceInput={jest.fn()}
          onPause={jest.fn()}
          onEnd={jest.fn()}
        />,
      );
    });

    const btn = await screen.findByTestId('end-interview-btn');
    await act(async () => {
      btn.click();
    });

    expect(mockClose).toHaveBeenCalled();
  });
}); 