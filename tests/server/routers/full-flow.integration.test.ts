/**
 * Full end-to-end backend integration test.
 * This test simulates a user flow: saving JD/Resume, creating a session (with a live AI call for the first question),
 * and submitting an answer (with a live AI call for the AI's response).
 * It verifies that tRPC routers, database interactions, and the (unmocked) Gemini AI service work together.
 */
import { type inferProcedureInput } from '@trpc/server';
import { createCallerFactory } from '~/server/api/trpc';
import { appRouter, type AppRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { db } from '~/server/db';
import type { User, JdResumeText as PrismaJdResumeText, SessionData as PrismaSessionData } from '@prisma/client';
import type { MvpSessionTurn, Persona } from '~/types';
import { zodMvpSessionTurnArray } from '~/types';
import { auth as actualAuth } from '~/server/auth'; // For mocking NextAuth
import { getPersona as actualGetPersona } from '~/lib/personaService'; // For mocking personaService
import 'dotenv/config'; // Ensure environment variables are loaded for Gemini API key

// --- Mock NextAuth.js ---
interface MockSession {
  user: User;
  expires: string;
}
jest.mock('~/server/auth', () => ({
  __esModule: true,
  auth: jest.fn<Promise<MockSession | null>, []>(),
}));
import { auth } from '~/server/auth';
const mockedAuth = auth as jest.Mock<Promise<MockSession | null>, []>;

// --- Mock Persona Service ---
// We mock personaService because its implementation is simple and not the focus of this integration test.
// The focus is on the interaction with the (live) Gemini service.
const MOCK_PERSONA_ID = 'test-persona-full-flow';
const MOCK_PERSONA_OBJECT: Persona = {
  id: MOCK_PERSONA_ID,
  name: 'Test Persona Full Flow',
  systemPrompt: 'You are a test persona for a full flow integration test.',
  initialGreeting: 'Hello from Test Persona Full Flow!',
  avatarUrl: null,
};
jest.mock('~/lib/personaService', () => ({
  __esModule: true,
  getPersona: jest.fn<Promise<Persona | null>, [string]>(),
}));
import { getPersona } from '~/lib/personaService';
const mockGetPersonaFn = getPersona as jest.Mock<Promise<Persona | null>, [string]>; 

// --- Helper to create tRPC caller ---
const createTestCaller = async (userParam: User | null = null) => {
  mockedAuth.mockResolvedValue(userParam ? { user: userParam, expires: 'any-date' } : null);
  const context = await createTRPCContext({ headers: new Headers() });
  const createCaller = createCallerFactory(appRouter);
  return createCaller(context);
};

// --- Test Suite ---
describe('Full Backend Flow Integration Test', () => {
  let user: User;
  let caller: ReturnType<typeof createCallerFactory<AppRouter>>;
  type JdResumeInput = inferProcedureInput<AppRouter['jdResume']['saveJdResumeText']>;
  type CreateSessionInput = inferProcedureInput<AppRouter['session']['createSession']>;
  type SubmitAnswerInput = inferProcedureInput<AppRouter['session']['submitAnswerToSession']>;

  const sampleJdText = "We are looking for a Senior Software Engineer with experience in TypeScript and cloud technologies.";
  const sampleResumeText = "I am a Senior Software Engineer with 10 years of experience in TypeScript, React, Node.js, AWS, and Azure.";

  beforeAll(async () => {
    // Ensure API key is set (basic check)
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set. This test requires a live API key.");
    }
  });

  beforeEach(async () => {
    user = await db.user.create({
      data: {
        email: `testuser-fullflow-${Date.now()}@example.com`,
        name: 'Test User Full Flow',
      },
    });
    caller = await createTestCaller(user);

    // Setup default mock for getPersona
    mockGetPersonaFn.mockResolvedValue(MOCK_PERSONA_OBJECT);
  });

  afterEach(async () => {
    mockGetPersonaFn.mockClear();
    // Clean up database records in reverse order of creation/dependency
    await db.sessionData.deleteMany({ where: { userId: user.id } });
    await db.jdResumeText.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('should successfully complete a sequence: save JD/Resume -> create session (live AI) -> submit answer (live AI)', async () => {
    // 1. Save JD/Resume Text
    const jdResumeInput: JdResumeInput = {
      jdText: sampleJdText,
      resumeText: sampleResumeText,
    };
    const savedJdResume = await caller.jdResume.saveJdResumeText(jdResumeInput);
    expect(savedJdResume).toBeDefined();
    expect(savedJdResume.jdText).toBe(sampleJdText);

    // 2. Create Session (live AI call for first question)
    const createSessionInput: CreateSessionInput = {
      personaId: MOCK_PERSONA_ID,
      // durationInSeconds is optional, defaults in router if not provided
    };
    const sessionResponse = await caller.session.createSession(createSessionInput);
    expect(sessionResponse).toBeDefined();
    expect(sessionResponse.sessionId).toBeTruthy();
    expect(sessionResponse.firstQuestion).toBeTruthy(); // Check that a question was returned
    expect(sessionResponse.firstQuestion.length).toBeGreaterThan(5); // Arbitrary check for some content

    // Verify session created in DB with the first AI turn
    const dbSession = await db.sessionData.findUnique({ where: { id: sessionResponse.sessionId } });
    expect(dbSession).toBeDefined();
    expect(dbSession!.userId).toBe(user.id);
    expect(dbSession!.jdResumeTextId).toBe(savedJdResume.id);
    expect(dbSession!.personaId).toBe(MOCK_PERSONA_ID);
    const historyAfterCreate = zodMvpSessionTurnArray.parse(dbSession!.history);
    expect(historyAfterCreate.length).toBe(1);
    expect(historyAfterCreate[0].role).toBe('model');
    expect(historyAfterCreate[0].text).toBe(sessionResponse.firstQuestion);
    expect(historyAfterCreate[0].rawAiResponseText).toBeTruthy();

    // 3. Submit Answer (live AI call for next question/analysis)
    const userAnswerText = "I'm excited about this opportunity and my experience with TypeScript aligns well.";
    const submitAnswerInput: SubmitAnswerInput = {
      sessionId: sessionResponse.sessionId,
      userAnswer: userAnswerText,
    };
    const submitResponse = await caller.session.submitAnswerToSession(submitAnswerInput);
    expect(submitResponse).toBeDefined();
    expect(submitResponse.nextQuestion).toBeTruthy();
    expect(submitResponse.nextQuestion.length).toBeGreaterThan(5);
    expect(submitResponse.analysis).toBeDefined(); // Analysis might be empty string, but should be defined
    expect(submitResponse.rawAiResponseText).toBeTruthy();

    // Verify session history updated in DB
    const dbSessionAfterSubmit = await db.sessionData.findUnique({ where: { id: sessionResponse.sessionId } });
    expect(dbSessionAfterSubmit).toBeDefined();
    const historyAfterSubmit = zodMvpSessionTurnArray.parse(dbSessionAfterSubmit!.history);
    expect(historyAfterSubmit.length).toBe(3); // Initial AI q + User answer + Next AI q
    
    // Check user turn
    const userTurn = historyAfterSubmit.find(turn => turn.role === 'user');
    expect(userTurn).toBeDefined();
    expect(userTurn!.text).toBe(userAnswerText);

    // Check second AI turn (the response to user's answer)
    const secondAiTurn = historyAfterSubmit.find(turn => turn.role === 'model' && turn.id !== historyAfterCreate[0].id);
    expect(secondAiTurn).toBeDefined();
    expect(secondAiTurn!.text).toBe(submitResponse.nextQuestion);
    expect(secondAiTurn!.rawAiResponseText).toBe(submitResponse.rawAiResponseText);
    expect(secondAiTurn!.analysis).toBe(submitResponse.analysis);
    // feedbackPoints and suggestedAlternative might not always be present, so check definition or presence if non-empty
    if (submitResponse.feedbackPoints && submitResponse.feedbackPoints.length > 0) {
      expect(secondAiTurn!.feedbackPoints).toEqual(submitResponse.feedbackPoints);
    }
    if (submitResponse.suggestedAlternative) {
        expect(secondAiTurn!.suggestedAlternative).toBe(submitResponse.suggestedAlternative);
    }
  }, 30000); // Increase timeout for live API calls
}); 