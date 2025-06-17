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