/**
 * Tests for the endQuestion tRPC mutation.
 */

import { createCaller } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { db } from '~/server/db';
import { auth as actualAuth } from '~/server/auth';
import type { User, JdResumeText } from '@prisma/client';

// Mock auth
jest.mock('~/server/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));
const mockedAuth = actualAuth as unknown as jest.MockedFunction<typeof actualAuth>;

// Minimal helper to get caller with mocked session
const getCaller = async (user: User | null) => {
  if (user) {
    (mockedAuth as jest.Mock).mockResolvedValueOnce({
      user: { id: user.id, email: user.email },
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  } else {
    (mockedAuth as jest.Mock).mockResolvedValueOnce(null);
  }
  const ctx = await createTRPCContext({ headers: new Headers() });
  return createCaller(ctx);
};

// Test data
const QUESTION = 'Explain polymorphism';
const TRANSCRIPT = 'Polymorphism allows objects to be treated uniformly.';

describe('session.endQuestion', () => {
  let user: User;
  let jd: JdResumeText;
  let sessionId: string;

  beforeEach(async () => {
    user = await db.user.create({
      data: { email: `endq-${Date.now()}@test.com`, name: 'EndQ User' },
    });
    jd = await db.jdResumeText.create({
      data: { userId: user.id, jdText: 'JD', resumeText: 'Resume' },
    });

    // seed session with one question segment
    const segment = {
      question: QUESTION,
      questionNumber: 1,
      conversation: [
        { role: 'ai', content: QUESTION, timestamp: new Date().toISOString(), messageType: 'question' },
      ],
      startTime: new Date().toISOString(),
      endTime: null,
    };

    const session = await db.sessionData.create({
      data: {
        userId: user.id,
        jdResumeTextId: jd.id,
        personaId: 'test-persona',
        durationInSeconds: 0,
        questionSegments: [segment],
        currentQuestionIndex: 0,
      },
    });
    sessionId = session.id;
  });

  afterEach(async () => {
    await db.sessionData.deleteMany({ where: { userId: user.id } });
    await db.jdResumeText.deleteMany({ where: { id: jd.id } });
    await db.user.deleteMany({ where: { id: user.id } });
  });

  it('persists assessment and coaching and returns them', async () => {
    const caller = await getCaller(user);

    const res = await caller.session.endQuestion({
      sessionId,
      questionText: QUESTION,
      transcript: TRANSCRIPT,
    });

    expect(res).toEqual({ assessment: 'Pending', coaching: 'Feedback will be generated soon.' });

    const updated = await db.sessionData.findUniqueOrThrow({ where: { id: sessionId } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const segments = updated.questionSegments as unknown as Record<string, any>[];
    const seg = segments.find((s) => s.question === QUESTION);
    expect(seg).toBeDefined();
    expect(seg!.feedback).toMatchObject({ transcript: TRANSCRIPT });
  });
}); 