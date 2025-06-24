/**
 * 🔴 RED: Test tRPC procedures for batch generation
 * 
 * FILES UNDER TEST:
 * - src/server/api/routers/session.ts (MODIFY: startInterviewSession procedure)
 * - src/server/api/routers/session.ts (NEW: moveToNextQuestion procedure)
 * - src/types/index.ts (MODIFY: ActiveSessionData, StartInterviewSessionResponse interfaces)
 * - src/lib/gemini.ts (NEW: generateAllInterviewQuestions function integration)
 * - src/lib/personaService.ts (EXISTING: getPersona function usage)
 * 
 * PURPOSE: Test the modified tRPC procedures that will handle pre-generated questions.
 * These tests verify that sessions start with 3 pre-generated questions and can
 * navigate between them instantly without AI generation delays.
 * 
 * Following project pattern: getTestCaller + real test database + mocked AI services
 */

// Mock environment variables FIRST (following working test pattern)
jest.mock('~/env', () => ({
  env: {
    AUTH_DISCORD_ID: 'mock-discord-id',
    AUTH_DISCORD_SECRET: 'mock-discord-secret', 
    DATABASE_URL: 'file:./test.db',
    GEMINI_API_KEY: 'mock-gemini-key',
    NEXTAUTH_SECRET: 'mock-secret',
    NEXTAUTH_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
  },
}));

// Mock NextAuth.js following established pattern
import { auth as actualAuth } from '~/server/auth';
jest.mock('~/server/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));
const mockedAuth = actualAuth as jest.MockedFunction<typeof actualAuth>;

// Mock AI services following established pattern - include ALL functions used by session router
jest.mock('~/lib/gemini', () => ({
  __esModule: true,
  getFirstQuestion: jest.fn(),
  continueConversation: jest.fn(),
  getNewTopicalQuestion: jest.fn(),
  generateAllInterviewQuestions: jest.fn(),
}));

jest.mock('~/lib/personaService', () => ({
  __esModule: true,
  getPersona: jest.fn(),
}));

// Import after mocks are set up
import { createCaller } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { db } from '~/server/db';
import { zodQuestionSegmentArray } from '~/types';
import type { User, JdResumeText, SessionData, Prisma } from '@prisma/client';
import type { QuestionSegment, TopicalQuestionResponse } from '~/types';

// Import the mocked functions following established pattern
import { 
  getFirstQuestion, 
  continueConversation, 
  getNewTopicalQuestion,
  generateAllInterviewQuestions
} from '~/lib/gemini';
import { getPersona } from '~/lib/personaService';

// Cast to jest mocks following established pattern
const mockGetFirstQuestion = getFirstQuestion as jest.MockedFunction<typeof getFirstQuestion>;
const mockContinueConversation = continueConversation as jest.MockedFunction<typeof continueConversation>;
const mockGetNewTopicalQuestion = getNewTopicalQuestion as jest.MockedFunction<typeof getNewTopicalQuestion>;
const mockGenerateAllQuestions = generateAllInterviewQuestions as jest.MockedFunction<typeof generateAllInterviewQuestions>;
const mockGetPersona = getPersona as jest.MockedFunction<typeof getPersona>;

describe('🔴 RED: Pre-generated Questions tRPC Procedures (src/server/api/routers/session.ts)', () => {
  let testUser: User;
  let testJdResume: JdResumeText;
  let testSession: SessionData;

  // Follow established getTestCaller pattern
  const getTestCaller = async (sessionUser: User | null = null) => {
    if (sessionUser) {
      const mockSession = {
        user: {
          id: sessionUser.id,
          name: sessionUser.name ?? null,
          email: sessionUser.email ?? null,
          image: null,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      (mockedAuth as jest.Mock).mockResolvedValueOnce(mockSession);
    } else {
      (mockedAuth as jest.Mock).mockResolvedValueOnce(null);
    }
    const ctx = await createTRPCContext({ headers: new Headers() });
    return createCaller(ctx);
  };

  beforeAll(async () => {
    // Create real user first
    testUser = await db.user.create({
      data: {
        email: `test-pregenerated-${Date.now()}@example.com`,
        name: 'Test User Pregenerated',
      },
    });

    // Then create JdResume with valid userId
    testJdResume = await db.jdResumeText.create({
      data: {
        jdText: 'Senior React Developer position requiring React, TypeScript, Node.js expertise.',
        resumeText: 'Experienced developer with 5 years React experience, Redux, Jest testing.',
        userId: testUser.id,
      },
    });
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Then create session - use valid persona ID
    testSession = await db.sessionData.create({
      data: {
        userId: testUser.id,
        jdResumeTextId: testJdResume.id,
        personaId: 'swe-interviewer-standard', // Use valid persona ID
        durationInSeconds: 1800,
        questionSegments: [],
        currentQuestionIndex: 0,
      },
    });

    // Setup mocks for successful AI operations
    mockGetPersona.mockResolvedValue({
      id: 'swe-interviewer-standard',
      name: 'Technical Lead',
      systemPrompt: 'You are a technical interviewer focused on React and frontend development.',
    });

    const mockQuestions: TopicalQuestionResponse[] = [
      {
        questionText: 'Tell me about your React experience and component architecture approach.',
        keyPoints: ['Component design patterns', 'State management approach', 'Performance considerations'],
        rawAiResponseText: 'Mock AI response for React experience question',
      },
      {
        questionText: 'How do you handle complex state management in large React applications?',
        keyPoints: ['Redux vs Context API', 'State normalization', 'Async state handling'],
        rawAiResponseText: 'Mock AI response for state management question',
      },
      {
        questionText: 'Describe a challenging technical problem you solved and your approach.',
        keyPoints: ['Problem analysis', 'Solution design', 'Implementation strategy'],
        rawAiResponseText: 'Mock AI response for problem-solving question',
      },
    ];

    mockGenerateAllQuestions.mockResolvedValue(mockQuestions);
  });

  afterEach(async () => {
    // Cleanup session after each test
    await db.sessionData.deleteMany({ where: { userId: testUser.id } });
  });

  afterAll(async () => {
    // Cleanup all test data
    await db.jdResumeText.deleteMany({ where: { userId: testUser.id } });
    await db.user.deleteMany({ where: { id: testUser.id } });
    await db.$disconnect();
  });

  describe('startInterviewSession with batch generation', () => {
    it('should generate and store 3 questions during session start', async () => {
      // 🟢 This test WILL FAIL until the batch generation logic is fully implemented
      const caller = await getTestCaller(testUser);

      const result = await caller.session.startInterviewSession({
        sessionId: testSession.id,
        personaId: 'swe-interviewer-standard'
      });

      // The real AI response is now being returned from the mock
      expect(result).toMatchObject({
        sessionId: testSession.id,
        isActive: true,
        personaId: 'swe-interviewer-standard',
        questionNumber: 1,
        totalQuestions: 3,
        currentQuestion: expect.stringContaining('Tell me about your React experience')
      });

      expect(mockGenerateAllQuestions).toHaveBeenCalledWith(
        expect.objectContaining({ jdText: testJdResume.jdText }),
        expect.objectContaining({ id: 'swe-interviewer-standard' }),
        3
      );

      const updatedSession = await db.sessionData.findUnique({ where: { id: testSession.id } });
      // The `as unknown` cast is critical for type safety with Zod and Prisma's JsonValue
      const segments = zodQuestionSegmentArray.parse(updatedSession!.questionSegments as unknown);
      expect(segments).toHaveLength(3);
      expect(segments[0]!.question).toBe('Tell me about your React experience and component architecture approach.');
      expect(segments[1]!.questionNumber).toBe(2);
    });

    it('should handle batch generation failures gracefully', async () => {
      // 🟢 This test should now correctly check for a thrown error from the procedure
      mockGenerateAllQuestions.mockRejectedValue(new Error('AI service unavailable'));
      const caller = await getTestCaller(testUser);

      await expect(
        caller.session.startInterviewSession({
          sessionId: testSession.id,
          personaId: 'swe-interviewer-standard',
        })
      ).rejects.toThrow(/AI service|batch generation|unavailable/);
    });
  });

  describe('moveToNextQuestion procedure', () => {
    beforeEach(async () => {
      // Setup session with 3 pre-generated questions for navigation testing
      const preGeneratedSegments: QuestionSegment[] = [
        {
          questionId: 'q1_technical',
          questionNumber: 1,
          questionType: 'technical',
          question: 'Tell me about your React experience and component architecture approach.',
          keyPoints: ['Component design patterns', 'State management approach', 'Performance considerations'],
          startTime: new Date().toISOString(),
          endTime: null,
          conversation: [
            { role: 'ai', content: 'Tell me about your React experience...', timestamp: new Date().toISOString(), messageType: 'question' },
            { role: 'user', content: 'I have 3 years of React experience.', timestamp: new Date().toISOString(), messageType: 'response' },
          ],
        },
        {
          questionId: 'q2_technical',
          questionNumber: 2,
          questionType: 'technical',
          question: 'How do you handle complex state management in large React applications?',
          keyPoints: ['Redux vs Context API', 'State normalization', 'Async state handling'],
          startTime: null,
          endTime: null,
          conversation: [],
        },
        {
          questionId: 'q3_behavioral',
          questionNumber: 3,
          questionType: 'behavioral',
          question: 'Describe a challenging technical problem you solved and your approach.',
          keyPoints: ['Problem analysis', 'Solution design', 'Implementation strategy'],
          startTime: null,
          endTime: null,
          conversation: [],
        },
      ];

      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          questionSegments: preGeneratedSegments as unknown as Prisma.InputJsonValue,
          currentQuestionIndex: 0,
        },
      });
    });

    it('should navigate to pre-generated next question instantly', async () => {
      // 🟢 This test should now PASS - moveToNextQuestion is implemented
      const caller = await getTestCaller(testUser);
      
      const result = await caller.session.moveToNextQuestion({ sessionId: testSession.id });

      expect(result).toMatchObject({
        questionText: 'How do you handle complex state management in large React applications?',
        questionNumber: 2,
        totalQuestions: 3,
        isComplete: false,
      });

      // Instant navigation should not re-generate questions
      expect(mockGenerateAllQuestions).not.toHaveBeenCalled();

      const updatedSession = await db.sessionData.findUnique({ where: { id: testSession.id } });
      expect(updatedSession?.currentQuestionIndex).toBe(1);
      
      // Add null check for updatedSession and segments
      expect(updatedSession?.questionSegments).toBeDefined();

      const segments = zodQuestionSegmentArray.parse(updatedSession!.questionSegments as unknown);
      expect(segments.length).toBeGreaterThanOrEqual(2);
      
      // Since we checked length, we can safely access elements
      expect(segments[0]!.endTime).not.toBeNull();
      expect(segments[1]!.startTime).not.toBeNull();
    });

    it('should complete interview after moving past question 3', async () => {
      // 🟢 This test should now PASS - completion logic is implemented
      await db.sessionData.update({
        where: { id: testSession.id },
        data: { currentQuestionIndex: 2 },
      });

      const caller = await getTestCaller(testUser);

      const result = await caller.session.moveToNextQuestion({ sessionId: testSession.id });

      expect(result).toMatchObject({
        isComplete: true,
        message: expect.stringContaining('Interview completed!'),
      });

      const completedSession = await db.sessionData.findUnique({ where: { id: testSession.id } });
      expect(completedSession?.endTime).not.toBeNull();
    });
  });

  describe('Integration with existing procedures', () => {
    beforeEach(async () => {
        mockContinueConversation.mockResolvedValue({
            followUpQuestion: 'Can you tell me more about that specific project?',
            analysis: 'Good response showing relevant experience.',
            feedbackPoints: ['Clear communication', 'Relevant examples'],
            rawAiResponseText: 'Mock conversation continuation response',
        });
    });

    it('should not break existing submitResponse procedure', async () => {
      // Setup session with a pre-generated question
      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          currentQuestionIndex: 0,
          questionSegments: [
            {
              questionId: 'q1_technical',
              questionNumber: 1,
              questionType: 'technical' as const,
              question: 'Tell me about your React experience.',
              keyPoints: ['Components', 'State', 'Performance'],
              startTime: new Date().toISOString(),
              endTime: null,
              conversation: [
                {
                  role: 'ai' as const,
                  content: 'Tell me about your React experience.',
                  timestamp: new Date().toISOString(),
                  messageType: 'question' as const,
                },
              ],
            },
          ] as unknown as Prisma.InputJsonValue,
        },
      });

      const caller = await getTestCaller(testUser);

      // This should still work with the existing implementation
      const response = await caller.session.submitResponse({
        sessionId: testSession.id,
        userResponse: 'I have 5 years of React experience.',
      });

      expect(response).toHaveProperty('conversationHistory');
      expect(response.conversationHistory).toHaveLength(3); // Question + User Response + AI Follow-up
      
      const aiFollowUp = response.conversationHistory[2];
      expect(aiFollowUp).toMatchObject({
        role: 'ai',
        content: 'Can you tell me more about that specific project?',
        messageType: 'response',
      });
    });
  });
}); 