/**
 * Unit test – gemini.ts live helpers
 * Ensures `transcribeAudioOnce` returns the first transcript string produced by
 * the mocked Google Gemini Live API session.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/ban-ts-comment */

import { jest } from '@jest/globals';

// @ts-nocheck

// --- Mock the @google/genai SDK -------------------------------------------

// We widen the jest mock generic types to avoid TS "never" constraints in .mockResolvedValue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockConnect: any = jest.fn();

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      public aio: any;
      constructor() {
        this.aio = { live: { connect: mockConnect } };
      }
    },
  };
});

// Now that the module is mocked, import the helper under test
import { transcribeAudioOnce } from '~/lib/gemini';

import { openLiveInterviewSession } from '~/lib/gemini';

// --------------------------------------------------------------------------

describe('transcribeAudioOnce', () => {
  beforeEach(() => {
    mockConnect.mockReset();
  });

  it('returns the transcript from the live session', async () => {
    // Fake live session object returned by genAI.aio.live.connect()
    const fakeSession = {
      // @ts-expect-error – jest mock Typings accept any value here
      send: jest.fn().mockResolvedValue(undefined),
      async *[Symbol.asyncIterator]() {
        yield { transcript: 'hello world' };
      },
    };

    mockConnect.mockResolvedValue(fakeSession as any);

    const buffer = Buffer.from('fake audio');
    const result = await transcribeAudioOnce(buffer);

    expect(result).toBe('hello world');
    expect(mockConnect).toHaveBeenCalledTimes(1);
    // ensure we forwarded the chunk and end-of-turn marker
    expect(fakeSession.send).toHaveBeenCalled();
  });

  it('exposes sendAudioChunk & stop on persistent connection', async () => {
    const fakeSession = {
      // @ts-expect-error – jest mock Typings accept any value here
      send: jest.fn().mockResolvedValue(undefined),
      // @ts-expect-error – jest mock Typings accept any value here
      close: jest.fn().mockResolvedValue(undefined),
      async *[Symbol.asyncIterator]() {
        yield { text: 'Q1: Tell me about yourself', role: 'model' };
        yield { text: 'final transcript', type: 'TRANSCRIPT' };
      },
    };

    mockConnect.mockResolvedValue(fakeSession as any);

    const session = await openLiveInterviewSession('You are an interviewer');

    expect(typeof session.sendAudioChunk).toBe('function');
    expect(typeof session.stopTurn).toBe('function');

    await session.sendAudioChunk(new Uint8Array([1, 2, 3]));
    expect(fakeSession.send).toHaveBeenCalled();

    await session.stopTurn();
    expect(fakeSession.send).toHaveBeenLastCalledWith({ audio: 'stop' });
  });
});

// =============================================================
// Phase 2 – One-socket-per-question helper behaviour (RED tests)
// =============================================================

/*
 These tests describe the desired contract for the upcoming refactor that
 introduces one-socket-per-question behaviour (see §9 of feature_voice_modality.md).
 They intentionally FAIL until the production code in ~/lib/gemini.ts is upgraded.
*/

describe('openLiveInterviewSession – per-question flow contract', () => {
  const QUESTION = 'Explain polymorphism in OOP';

  beforeEach(() => {
    mockConnect.mockReset();
  });

  it('embeds the question text in the systemInstruction on connect (RED)', async () => {
    // Arrange: create a fake Live API session that does nothing
    const fakeSession = {
      // @ts-expect-error – jest mock Typings accept any value here
      send: jest.fn().mockResolvedValue(undefined),
      async *[Symbol.asyncIterator]() {
        /* iterator intentionally empty for this test */
        return;
      },
    };
    mockConnect.mockResolvedValue(fakeSession as any);

    // Act
    await openLiveInterviewSession(QUESTION);

    // Assert – systemInstruction should include the question text
    expect(mockConnect).toHaveBeenCalledTimes(1);
    const connectArgs = mockConnect.mock.calls[0]?.[0] as { systemInstruction?: string };
    expect(connectArgs?.systemInstruction).toEqual(expect.stringContaining(QUESTION));
  });

  it('automatically ends the turn after 10 minutes (RED)', async () => {
    jest.useFakeTimers({ legacyFakeTimers: false });

    const fakeSession = {
      // @ts-expect-error – jest mock Typings accept any value here
      send: jest.fn().mockResolvedValue(undefined),
      // @ts-expect-error – jest mock Typings accept any value here
      close: jest.fn().mockResolvedValue(undefined),
      async *[Symbol.asyncIterator]() {
        /* iterator intentionally empty for this test */
        return;
      },
    };
    mockConnect.mockResolvedValue(fakeSession as any);

    await openLiveInterviewSession(QUESTION);

    // Fast-forward exactly ten minutes
    jest.advanceTimersByTime(10 * 60 * 1000 + 1000); // add a small buffer

    // Flush any pending promises/micro-tasks
    await Promise.resolve();
    await Promise.resolve();

    // Expect helper to end the turn – either via audio.stop or socket close
    expect(
      fakeSession.send.mock.calls.some((c: unknown[]) =>
        JSON.stringify(c[0]) === JSON.stringify({ audio: 'stop' }),
      ) || fakeSession.close.mock.calls.length > 0,
    ).toBe(true);

    jest.useRealTimers();
  });
}); 