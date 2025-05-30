/**
 * Test suite for the Session tRPC Router (src/server/api/routers/session.ts).
 *
 * This suite focuses on integration-testing the tRPC procedures related to sessions,
 * such as creating sessions, retrieving session state, submitting answers,
 * and getting report data.
 *
 * Mocks will be used for external services like `lib/gemini.ts` and `lib/personaService.ts`.
 * A test database will be used for Prisma client operations.
 */

import { type inferProcedureInput } from '@trpc/server';
import { createCaller } from '~/server/api/root';
import { appRouter, type AppRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { db } from '~/server/db';
import type { SessionData, JdResumeText, User } from '@prisma/client'; // Assuming Prisma client types
import type { JsonValue } from '@prisma/client/runtime/library';
import type { MvpSessionTurn, MvpAiResponse, Persona } from '~/types'; // Assuming your custom types
import { zodMvpSessionTurnArray } from '~/types'; // Assuming you have a zod schema for MvpSessionTurn
import { Prisma } from '@prisma/client'; // Assuming Prisma client types

// --- Mock External Dependencies ---

// Mock auth from NextAuth.js
import { auth as actualAuth } from '~/server/auth'; // Import actual to get its type for casting
jest.mock('~/server/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));
const mockedAuth = actualAuth as jest.MockedFunction<typeof actualAuth>;

// Mock '~/lib/gemini'
jest.mock('~/lib/gemini', () => ({
  __esModule: true,
  getFirstQuestion: jest.fn(),
  continueInterview: jest.fn(),
  // Add other functions if needed, ensure they are also jest.fn()
}));

// Mock '~/lib/personaService'
jest.mock('~/lib/personaService', () => ({
  __esModule: true,
  getPersona: jest.fn(),
}));

// Import the mocked functions to get references to them for tests
import { getFirstQuestion, continueInterview } from '~/lib/gemini';
import { getPersona } from '~/lib/personaService';

// Cast them to jest.MockedFunction for type safety with mock methods
const mockGetFirstQuestionFn = getFirstQuestion as jest.MockedFunction<typeof getFirstQuestion>;
const mockContinueInterviewFn = continueInterview as jest.MockedFunction<typeof continueInterview>;
const mockGetPersonaFn = getPersona as jest.MockedFunction<typeof getPersona>;

const MOCK_PERSONA_ID = 'test-persona-id';
const MOCK_PERSONA_OBJECT: Persona = {
  id: MOCK_PERSONA_ID,
  name: 'Test Persona',
  systemPrompt: 'You are a test persona.',
};
// Default mock implementation for getPersona can be set in beforeEach or per test

// --- Test Suite ---
describe('Session tRPC Router', () => {
  let user: User;
  let jdResume: JdResumeText;

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
      // Since mockedAuth is (auth as jest.MockedFunction<...>), its type should be correct for mockResolvedValueOnce
      (mockedAuth as any).mockResolvedValueOnce(mockSession); // Using 'as any' temporarily if type issues persist with the mock itself
    } else {
      (mockedAuth as any).mockResolvedValueOnce(null);
    }
    const ctx = await createTRPCContext({ headers: new Headers() });
    return createCaller(ctx);
  };

  beforeAll(async () => {
    // One-time setup
  });

  afterAll(async () => {
    await db.sessionData.deleteMany({});
    await db.jdResumeText.deleteMany({});
    await db.user.deleteMany({});
    await db.$disconnect();
  });

  beforeEach(async () => {
    // Reset all imported mock functions
    mockGetFirstQuestionFn.mockReset();
    mockContinueInterviewFn.mockReset();
    mockGetPersonaFn.mockReset();
    (mockedAuth as jest.Mock).mockReset(); // Reset the auth mock

    // Setup default resolved values for mocks
    mockGetPersonaFn.mockResolvedValue(MOCK_PERSONA_OBJECT);
    mockGetFirstQuestionFn.mockResolvedValue({
      questionText: 'Default first question?',
      rawAiResponseText: '<QUESTION>Default first question?</QUESTION>',
    });
    mockContinueInterviewFn.mockResolvedValue({
      nextQuestion: 'Default next question?',
      analysis: 'Default analysis.',
      feedbackPoints: ['Default feedback.'],
      suggestedAlternative: 'Default alternative.',
      rawAiResponseText: '<QUESTION>Default next question?</QUESTION><ANALYSIS>...</ANALYSIS>',
    } as MvpAiResponse & { rawAiResponseText: string });

    user = await db.user.create({
      data: { email: `user-${Date.now()}@test.com`, name: 'Test User' },
    });
    jdResume = await db.jdResumeText.create({
      data: { userId: user.id, jdText: 'Test JD', resumeText: 'Test Resume' },
    });
  });

  afterEach(async () => {
    await db.sessionData.deleteMany({ where: { userId: user.id } });
    await db.jdResumeText.deleteMany({ where: { userId: user.id } });
    await db.user.deleteMany({ where: { id: user.id } });
  });

  describe('createSession procedure', () => {
    it('should create a new session with the first question from Gemini, and save to DB', async () => {
      const caller = await getTestCaller(user);
      const mockInputPersonaId = MOCK_PERSONA_ID;
      const mockFirstQuestionText = 'What is your greatest strength?';
      const mockRawAiResponse = `<QUESTION>${mockFirstQuestionText}</QUESTION>`;

      // Specific mock setup for this test if needed (overrides beforeEach defaults)
      mockGetPersonaFn.mockResolvedValue(MOCK_PERSONA_OBJECT); // Could be more specific if needed
      mockGetFirstQuestionFn.mockResolvedValue({
        questionText: mockFirstQuestionText,
        rawAiResponseText: mockRawAiResponse,
      });

      const result = await caller.session.createSession({ personaId: mockInputPersonaId });

      expect(mockGetPersonaFn).toHaveBeenCalledWith(mockInputPersonaId);
      expect(mockGetFirstQuestionFn).toHaveBeenCalledWith(
        expect.objectContaining({ id: jdResume.id, jdText: jdResume.jdText, resumeText: jdResume.resumeText }),
        MOCK_PERSONA_OBJECT
      );

      const newSessionFromDb = await db.sessionData.findUnique({
        where: { id: result.sessionId },
      });

      expect(newSessionFromDb).toBeDefined();
      expect(newSessionFromDb!.userId).toBe(user.id);
      expect(newSessionFromDb!.jdResumeTextId).toBe(jdResume.id);
      expect(newSessionFromDb!.personaId).toBe(mockInputPersonaId);
      
      const history = newSessionFromDb!.history as unknown as MvpSessionTurn[];
      expect(history).toBeInstanceOf(Array);
      expect(history[0].role).toBe('model');
      expect(history[0].text).toBe(mockFirstQuestionText);
      expect(history[0].rawAiResponseText).toBe(mockRawAiResponse);
      expect(history[0].id).toBeDefined();
      expect(history[0].timestamp).toBeDefined();

      expect(result.sessionId).toBe(newSessionFromDb.id);
      expect(result.firstQuestion).toBe(mockFirstQuestionText);
      expect(result.rawAiResponseText).toBe(mockRawAiResponse);
    });

    it('should handle errors if JD/Resume text for user is not found', async () => {
      // Arrange: Create a user who will not have a JdResumeText record
      const userWithoutJd = await db.user.create({
        data: { email: `user-no-jd-${Date.now()}@test.com`, name: 'User Without JD' },
      });
      const caller = await getTestCaller(userWithoutJd);
      const input = { personaId: MOCK_PERSONA_ID };

      // Act & Assert
      await expect(caller.session.createSession(input))
        .rejects.toThrowError("JD/Resume not found for user.");

      // Ensure external services were not called
      expect(mockGetPersonaFn).not.toHaveBeenCalled();
      expect(mockGetFirstQuestionFn).not.toHaveBeenCalled();
      
      // Ensure no session was created
      const sessionsForUser = await db.sessionData.findMany({ where: { userId: userWithoutJd.id } });
      expect(sessionsForUser.length).toBe(0);

      // Clean up the specifically created user for this test
      await db.user.delete({ where: { id: userWithoutJd.id } });
    });
  });

  describe('getSessionById procedure', () => {
    it('should return session data for a valid session ID belonging to the user', async () => {
      // Arrange
      const caller = await getTestCaller(user);
      const initialHistory: MvpSessionTurn[] = [
        {
          id: 'turn-1',
          role: 'model',
          text: 'Initial question',
          timestamp: new Date(),
          rawAiResponseText: '<QUESTION>Initial question</QUESTION>',
        },
      ];
      const createdSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 600,
          history: initialHistory as unknown as Prisma.JsonValue, // Cast to Prisma.JsonValue
        },
      });

      // Act
      const result = await caller.session.getSessionById({ sessionId: createdSession.id });

      // Assert
      expect(result).not.toBeNull();
      expect(result!.id).toBe(createdSession.id);
      expect(result!.userId).toBe(user.id);
      expect(result!.personaId).toBe(MOCK_PERSONA_ID);
      expect(result!.jdResumeTextId).toBe(jdResume.id);
      expect(result!.durationInSeconds).toBe(600);
      
      // Validate history by parsing it, as it comes back as JSON from the DB via tRPC
      const parsedHistory = zodMvpSessionTurnArray.parse(result!.history);
      expect(parsedHistory).toEqual(initialHistory); // Comparing array of objects with Date instances
      
      // Fallback/additional checks if the above toEqual fails due to Date object intricacies
      expect(parsedHistory.length).toBe(initialHistory.length);
      if (initialHistory.length > 0 && parsedHistory.length > 0) {
        expect(parsedHistory[0].id).toBe(initialHistory[0].id);
        expect(parsedHistory[0].role).toBe(initialHistory[0].role);
        expect(parsedHistory[0].text).toBe(initialHistory[0].text);
        expect(parsedHistory[0].rawAiResponseText).toBe(initialHistory[0].rawAiResponseText);
        expect(parsedHistory[0].timestamp.getTime()).toBe(initialHistory[0].timestamp.getTime());
      }
    });

    it('should return null if session is not found or not owned by the user', async () => {
      const caller = await getTestCaller(user);

      // Scenario 1: Session ID does not exist
      const nonExistentSessionId = 'non-existent-session-id-123';
      const resultForNonExistent = await caller.session.getSessionById({ sessionId: nonExistentSessionId });
      expect(resultForNonExistent).toBeNull();

      // Scenario 2: Session ID exists but belongs to another user
      const otherUser = await db.user.create({
        data: { email: `otheruser-${Date.now()}@test.com`, name: 'Other User' },
      });
      const otherUserSession = await db.sessionData.create({
        data: {
          userId: otherUser.id,
          jdResumeTextId: jdResume.id, // Can reuse jdResume from beforeEach or create a new one for otherUser
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 300,
          history: [],
        },
      });

      const resultForOtherUserSession = await caller.session.getSessionById({ sessionId: otherUserSession.id });
      expect(resultForOtherUserSession).toBeNull();

      // Clean up data created for this specific test scenario
      await db.sessionData.delete({ where: { id: otherUserSession.id } });
      await db.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('submitAnswerToSession procedure', () => {
    it('should update history, call services, and return AI response on valid input', async () => {
      // Arrange
      const initialModelTurn: MvpSessionTurn = {
        id: 'turn-initial-model',
        role: 'model',
        text: 'This is the first AI question.',
        rawAiResponseText: '<QUESTION>This is the first AI question.</QUESTION>',
        timestamp: new Date(Date.now() - 10000), // A bit in the past
      };
      const createdSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 600,
          history: [initialModelTurn] as unknown as Prisma.JsonValue,
        },
      });

      const userAnswerText = "This is the user's answer.";
      const mockAiContinuationResponse: MvpAiResponse & { rawAiResponseText: string } = {
        nextQuestion: "What is your next thought?",
        analysis: "User answer was insightful.",
        feedbackPoints: ["Good point A", "Good point B"],
        suggestedAlternative: "Could also say C.",
        rawAiResponseText: "<QUESTION>What is your next thought?</QUESTION><ANALYSIS>User answer was insightful.</ANALYSIS>",
      };
      mockGetPersonaFn.mockResolvedValue(MOCK_PERSONA_OBJECT); // Already default, but good to be explicit
      mockContinueInterviewFn.mockResolvedValue(mockAiContinuationResponse);

      const caller = await getTestCaller(user);
      const input = { sessionId: createdSession.id, userAnswer: userAnswerText };

      // Act
      const result = await caller.session.submitAnswerToSession(input);

      // Assert - Return Value
      expect(result).toEqual(mockAiContinuationResponse);

      // Assert - Mock Calls
      expect(mockGetPersonaFn).toHaveBeenCalledWith(MOCK_PERSONA_ID);
      
      expect(mockContinueInterviewFn).toHaveBeenCalledWith(
        expect.objectContaining({ id: jdResume.id }),
        MOCK_PERSONA_OBJECT,
        expect.any(Array), // We will inspect this array separately
        userAnswerText
      );

      // Inspect the history that was actually passed to continueInterview
      const historyPassedToContinueInterview = mockContinueInterviewFn.mock.calls[0][2] as MvpSessionTurn[];
      expect(historyPassedToContinueInterview.length).toBe(2);
      // First turn should be the initial model turn (deep equality for dates requires care or getTime())
      expect(historyPassedToContinueInterview[0].id).toBe(initialModelTurn.id);
      expect(historyPassedToContinueInterview[0].role).toBe(initialModelTurn.role);
      expect(historyPassedToContinueInterview[0].text).toBe(initialModelTurn.text);
      expect(historyPassedToContinueInterview[0].timestamp.getTime()).toBe(initialModelTurn.timestamp.getTime());

      // Second turn should be the user's answer
      const userTurnPassedToAI = historyPassedToContinueInterview[1];
      expect(userTurnPassedToAI.role).toBe('user');
      expect(userTurnPassedToAI.text).toBe(userAnswerText);
      expect(userTurnPassedToAI.id).toEqual(expect.stringMatching(/^turn-\d+-user$/));
      expect(userTurnPassedToAI.timestamp).toEqual(expect.any(Date));

      // Assert - Database Update
      const updatedDbSession = await db.sessionData.findUnique({ where: { id: createdSession.id } });
      expect(updatedDbSession).toBeDefined();
      const updatedHistory = zodMvpSessionTurnArray.parse(updatedDbSession!.history);
      expect(updatedHistory.length).toBe(3);

      // Check user turn in DB
      const userTurnInDb = updatedHistory[1];
      expect(userTurnInDb.role).toBe('user');
      expect(userTurnInDb.text).toBe(userAnswerText);
      expect(userTurnInDb.id).toEqual(expect.stringMatching(/^turn-\d+-user$/));

      // Check AI turn in DB
      const aiTurnInDb = updatedHistory[2];
      expect(aiTurnInDb.role).toBe('model');
      expect(aiTurnInDb.text).toBe(mockAiContinuationResponse.nextQuestion);
      expect(aiTurnInDb.rawAiResponseText).toBe(mockAiContinuationResponse.rawAiResponseText);
      expect(aiTurnInDb.analysis).toBe(mockAiContinuationResponse.analysis);
      expect(aiTurnInDb.feedbackPoints).toEqual(mockAiContinuationResponse.feedbackPoints);
      expect(aiTurnInDb.suggestedAlternative).toBe(mockAiContinuationResponse.suggestedAlternative);
      expect(aiTurnInDb.id).toEqual(expect.stringMatching(/^turn-\d+-model$/));
    });

    it('should handle errors if session not found', async () => {
      // Arrange
      const caller = await getTestCaller(user);
      const input = {
        sessionId: 'non-existent-session-id-for-submit',
        userAnswer: "This answer won't be processed.",
      };

      // Act & Assert
      await expect(caller.session.submitAnswerToSession(input))
        .rejects.toThrowError("Session not found or not authorized.");

      // Ensure external AI service was not called
      expect(mockGetPersonaFn).not.toHaveBeenCalled();
      expect(mockContinueInterviewFn).not.toHaveBeenCalled();
    });

    it('should handle errors if getPersona service fails', async () => {
      // Arrange
      const createdSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 600,
          history: [{id: 't1', role: 'model', text: 'Q1', timestamp: new Date()}] as unknown as Prisma.JsonValue,
        },
      });
      mockGetPersonaFn.mockRejectedValueOnce(new Error("Persona service failed"));
      const caller = await getTestCaller(user);
      const input = { sessionId: createdSession.id, userAnswer: "Test answer" };

      // Act & Assert
      await expect(caller.session.submitAnswerToSession(input))
        .rejects.toThrowError("Persona service failed");
      
      expect(mockGetPersonaFn).toHaveBeenCalledWith(MOCK_PERSONA_ID);
      expect(mockContinueInterviewFn).not.toHaveBeenCalled();
    });
    
    it('should handle errors if continueInterview service fails', async () => {
      // Arrange
      const createdSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 600,
          history: [{id: 't1', role: 'model', text: 'Q1', timestamp: new Date()}] as unknown as Prisma.JsonValue,
        },
      });
      // Ensure getPersona succeeds
      mockGetPersonaFn.mockResolvedValue(MOCK_PERSONA_OBJECT);
      mockContinueInterviewFn.mockRejectedValueOnce(new Error("AI service failed"));
      const caller = await getTestCaller(user);
      const input = { sessionId: createdSession.id, userAnswer: "Test answer for AI fail" };

      // Act & Assert
      await expect(caller.session.submitAnswerToSession(input))
        .rejects.toThrowError("AI service failed");

      expect(mockGetPersonaFn).toHaveBeenCalledWith(MOCK_PERSONA_ID);
      expect(mockContinueInterviewFn).toHaveBeenCalled(); // It was called, then it threw
    });

  });

  describe('getReportBySessionId procedure', () => {
    it.todo('should return formatted report data for a completed session');
    it.todo('should handle errors if session not found or not completed');
  });

  // ==========================================
  // Phase 2A: Session Reports & Analytics Tests
  // ==========================================

  describe('getSessionReport procedure', () => {
    it('should return comprehensive session data with full history for authorized user', async () => {
      // Arrange: Create a completed session with multiple turns
      const completedSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 2700, // 45 minutes
          history: [
            {
              id: 'turn-1-model',
              role: 'model',
              text: 'Tell me about yourself',
              timestamp: new Date('2024-01-01T10:00:00Z'),
            },
            {
              id: 'turn-1-user',
              role: 'user', 
              text: 'I am a software engineer with 5 years experience',
              timestamp: new Date('2024-01-01T10:01:00Z'),
            },
            {
              id: 'turn-2-model',
              role: 'model',
              text: 'What are your technical strengths?',
              analysis: 'Good response showing experience',
              feedbackPoints: ['Clear communication'],
              timestamp: new Date('2024-01-01T10:02:00Z'),
            },
          ] satisfies MvpSessionTurn[],
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:15:00Z'),
        },
      });

      const caller = await getTestCaller(user);

      // Act
      const result = await caller.session.getSessionReport({ 
        sessionId: completedSession.id 
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.sessionId).toBe(completedSession.id);
      expect(result.durationInSeconds).toBe(2700);
      expect(result.history).toHaveLength(3);
      expect(result.questionCount).toBe(2); // Number of model questions
      expect(result.completionPercentage).toBeGreaterThan(0);
      expect(result.createdAt).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(result.averageResponseTime).toBeGreaterThan(0);
    });

    it('should throw error for session not owned by user', async () => {
      // Arrange: Create session for different user
      const otherUser = await db.user.create({
        data: {
          id: 'other-user-id',
          email: 'other@example.com',
          name: 'Other User',
        },
      });

      const otherSession = await db.sessionData.create({
        data: {
          userId: otherUser.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 1800,
          history: [],
        },
      });

      const caller = await getTestCaller(user);

      // Act & Assert
      await expect(
        caller.session.getSessionReport({ sessionId: otherSession.id })
      ).rejects.toThrow('Session not found or not authorized');

      // Cleanup
      await db.sessionData.delete({ where: { id: otherSession.id } });
      await db.user.delete({ where: { id: otherUser.id } });
    });

    it('should throw error for non-existent session', async () => {
      const caller = await getTestCaller(user);

      // Act & Assert
      await expect(
        caller.session.getSessionReport({ sessionId: 'non-existent-id' })
      ).rejects.toThrow('Session not found or not authorized');
    });
  });

  describe('getSessionAnalytics procedure', () => {
    it('should calculate performance metrics from session history', async () => {
      // Arrange: Create session with timed interactions
      const sessionWithMetrics = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 1800, // 30 minutes
          history: [
            {
              id: 'turn-1-model',
              role: 'model',
              text: 'Question 1',
              timestamp: new Date('2024-01-01T10:00:00Z'),
            },
            {
              id: 'turn-1-user',
              role: 'user',
              text: 'Answer 1',
              timestamp: new Date('2024-01-01T10:01:30Z'), // 90 seconds response
            },
            {
              id: 'turn-2-model',
              role: 'model',
              text: 'Question 2',
              timestamp: new Date('2024-01-01T10:02:00Z'),
            },
            {
              id: 'turn-2-user',
              role: 'user',
              text: 'Answer 2',
              timestamp: new Date('2024-01-01T10:03:00Z'), // 60 seconds response
            },
          ] satisfies MvpSessionTurn[],
        },
      });

      const caller = await getTestCaller(user);

      // Act
      const analytics = await caller.session.getSessionAnalytics({ 
        sessionId: sessionWithMetrics.id 
      });

      // Assert
      expect(analytics).toBeDefined();
      expect(analytics.sessionId).toBe(sessionWithMetrics.id);
      expect(analytics.totalQuestions).toBe(2);
      expect(analytics.totalAnswers).toBe(2);
      expect(analytics.averageResponseTime).toBe(75); // (90 + 60) / 2
      expect(analytics.responseTimeMetrics).toEqual([90, 60]);
      expect(analytics.completionPercentage).toBe(100);
      expect(analytics.sessionDurationMinutes).toBe(30);
      expect(analytics.performanceScore).toBeGreaterThanOrEqual(0);
      expect(analytics.performanceScore).toBeLessThanOrEqual(100);
    });

    it('should handle sessions with no responses gracefully', async () => {
      // Arrange: Create session with only AI questions
      const incompleteSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 300,
          history: [
            {
              id: 'turn-1-model',
              role: 'model',
              text: 'First question',
              timestamp: new Date('2024-01-01T10:00:00Z'),
            },
          ] satisfies MvpSessionTurn[],
        },
      });

      const caller = await getTestCaller(user);

      // Act
      const analytics = await caller.session.getSessionAnalytics({ 
        sessionId: incompleteSession.id 
      });

      // Assert
      expect(analytics.totalQuestions).toBe(1);
      expect(analytics.totalAnswers).toBe(0);
      expect(analytics.averageResponseTime).toBe(0);
      expect(analytics.responseTimeMetrics).toEqual([]);
      expect(analytics.completionPercentage).toBe(0);
      expect(analytics.performanceScore).toBe(0);
    });

    it('should throw error for unauthorized session access', async () => {
      const caller = await getTestCaller(user);

      // Act & Assert
      await expect(
        caller.session.getSessionAnalytics({ sessionId: 'unauthorized-session' })
      ).rejects.toThrow('Session not found or not authorized');
    });
  });

  describe('getSessionFeedback procedure', () => {
    it('should return AI-generated feedback for completed session', async () => {
      // Arrange: Create session with feedback-ready history
      const feedbackSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 2400,
          history: [
            {
              id: 'turn-1-model',
              role: 'model',
              text: 'Describe your experience with React',
              timestamp: new Date('2024-01-01T10:00:00Z'),
            },
            {
              id: 'turn-1-user',
              role: 'user',
              text: 'I have 3 years of React experience building scalable web applications',
              timestamp: new Date('2024-01-01T10:01:00Z'),
            },
            {
              id: 'turn-1-model-feedback',
              role: 'model',
              text: 'Great! Tell me about a challenging project',
              analysis: 'Strong technical background demonstrated',
              feedbackPoints: ['Clear communication', 'Relevant experience'],
              suggestedAlternative: 'Could provide more specific examples',
              timestamp: new Date('2024-01-01T10:02:00Z'),
            },
          ] satisfies MvpSessionTurn[],
        },
      });

      const caller = await getTestCaller(user);

      // Act
      const feedback = await caller.session.getSessionFeedback({ 
        sessionId: feedbackSession.id 
      });

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback.sessionId).toBe(feedbackSession.id);
      expect(feedback.overallScore).toBeGreaterThanOrEqual(0);
      expect(feedback.overallScore).toBeLessThanOrEqual(100);
      
      expect(feedback.strengths).toBeDefined();
      expect(Array.isArray(feedback.strengths)).toBe(true);
      expect(feedback.strengths.length).toBeGreaterThan(0);
      
      expect(feedback.areasForImprovement).toBeDefined();
      expect(Array.isArray(feedback.areasForImprovement)).toBe(true);
      
      expect(feedback.recommendations).toBeDefined();
      expect(Array.isArray(feedback.recommendations)).toBe(true);
      
      expect(feedback.detailedAnalysis).toBeDefined();
      expect(typeof feedback.detailedAnalysis).toBe('string');
      expect(feedback.detailedAnalysis.length).toBeGreaterThan(0);
      
      expect(feedback.skillAssessment).toBeDefined();
      expect(typeof feedback.skillAssessment).toBe('object');
    });

    it('should generate feedback even for incomplete sessions', async () => {
      // Arrange: Create session with minimal interaction
      const minimalSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 600,
          history: [
            {
              id: 'turn-1-model',
              role: 'model',
              text: 'Tell me about yourself',
              timestamp: new Date('2024-01-01T10:00:00Z'),
            },
            {
              id: 'turn-1-user',
              role: 'user',
              text: 'I am a developer',
              timestamp: new Date('2024-01-01T10:01:00Z'),
            },
          ] satisfies MvpSessionTurn[],
        },
      });

      const caller = await getTestCaller(user);

      // Act
      const feedback = await caller.session.getSessionFeedback({ 
        sessionId: minimalSession.id 
      });

      // Assert
      expect(feedback.sessionId).toBe(minimalSession.id);
      expect(feedback.overallScore).toBeGreaterThanOrEqual(0);
      expect(feedback.recommendations).toContain('Complete more questions for better assessment');
      expect(feedback.detailedAnalysis).toContain('limited interaction');
    });

    it('should throw error for non-existent session', async () => {
      const caller = await getTestCaller(user);

      // Act & Assert
      await expect(
        caller.session.getSessionFeedback({ sessionId: 'invalid-session-id' })
      ).rejects.toThrow('Session not found or not authorized');
    });

    it('should handle sessions with parsing errors gracefully', async () => {
      // Arrange: Create session with malformed history
      const malformedSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 300,
          history: [
            // Intentionally missing required fields to test error handling
            { id: 'broken', role: 'invalid' } as any,
          ],
        },
      });

      const caller = await getTestCaller(user);

      // Act & Assert
      await expect(
        caller.session.getSessionFeedback({ sessionId: malformedSession.id })
      ).rejects.toThrow('Invalid session history format');
    });
  });

}); 