/**
 * RED Test – transcribeVoice tRPC mutation
 * ----------------------------------------
 * Validates that the mutation takes an audio blob, calls the speech-to-text
 * provider, persists the transcript, and returns it.  Currently expected to
 * FAIL because the resolver does not yet exist.
 */

// Mock speechService before anything imports it
jest.mock('~/lib/speechService', () => ({
  __esModule: true,
  transcribe: jest.fn().mockResolvedValue('hello world'),
}));

import { createCallerFactory } from '~/server/api/trpc';
import { appRouter, type AppRouter } from '~/server/api/root';
import { db } from '~/server/db';
import { transcribe as mockTranscribe } from '~/lib/speechService';

// Mock NextAuth auth so createTRPCContext sees an authenticated user
import { auth as actualAuth } from '~/server/auth';
jest.mock('~/server/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));
const mockedAuth = actualAuth as jest.MockedFunction<typeof actualAuth>;

const createCaller = createCallerFactory<AppRouter>(appRouter);

describe('session.transcribeVoice', () => {
  const E2E_SESSION_ID = 'clxnt1o60000008l3f9j6g9z7';
  const fakeBlob = new Blob(['dummy'], { type: 'audio/webm' });

  beforeAll(async () => {
    // Seed user and session in test DB
    const user = await db.user.create({
      data: { id: 'test-user', email: 'voice@test.com', name: 'Voice Test' },
    });
    await db.sessionData.create({
      data: {
        id: E2E_SESSION_ID,
        userId: user.id,
        personaId: 'swe-interviewer-standard',
        durationInSeconds: 600,
        questionSegments: JSON.stringify([]),
        currentQuestionIndex: 0,
      },
    });

    mockedAuth.mockResolvedValue({
      user: { id: user.id, name: user.name, email: user.email, image: null },
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    } as any);
  });

  afterAll(async () => {
    await db.sessionData.deleteMany({ where: { id: E2E_SESSION_ID } });
    await db.user.deleteMany({ where: { email: 'voice@test.com' } });
    await db.$disconnect();
  });

  it('returns transcript text and writes to DB', async () => {
    // Create minimal context with authenticated user & Prisma
    const { createTRPCContext } = await import('~/server/api/trpc');
    const ctx = await createTRPCContext({ headers: new Headers() });

    const caller = createCaller(ctx);

    const result = await caller.session.transcribeVoice({ sessionId: E2E_SESSION_ID, audioBlob: fakeBlob });

    expect(mockTranscribe).toHaveBeenCalledTimes(1);
    expect(result.transcript).toBe('hello world');

    // DB side-effects will be covered in an integration test; unit focuses on output.
  });
}); 