/**
 * Unit test – gemini.ts live helpers
 * Ensures `transcribeAudioOnce` returns the first transcript string produced by
 * the mocked Google Gemini Live API session.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals';

// @ts-nocheck

// --- Mock the @google/genai SDK -------------------------------------------

const mockConnect = jest.fn();

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

// --------------------------------------------------------------------------

describe('transcribeAudioOnce', () => {
  beforeEach(() => {
    mockConnect.mockReset();
  });

  it('returns the transcript from the live session', async () => {
    // Fake live session object returned by genAI.aio.live.connect()
    const fakeSession = {
      send: jest.fn().mockResolvedValue(undefined),
      async *[Symbol.asyncIterator]() {
        yield { transcript: 'hello world' };
      },
    };

    mockConnect.mockResolvedValue(fakeSession);

    const buffer = Buffer.from('fake audio');
    const result = await transcribeAudioOnce(buffer);

    expect(result).toBe('hello world');
    expect(mockConnect).toHaveBeenCalledTimes(1);
    // ensure we forwarded the chunk and end-of-turn marker
    expect(fakeSession.send).toHaveBeenCalled();
  });

  it('exposes sendAudioChunk & stop on persistent connection (scaffold)', async () => {
    // RED placeholder – will fail until new helper is implemented
    expect(true).toBe(false);
  });
}); 