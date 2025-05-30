/**
 * Phase 3A: Live Interview Session TDD Tests
 * 
 * This file implements TDD for the core live interview functionality:
 * - startInterviewSession: Initialize session with persona and first question
 * - getNextQuestion: Process user response and generate next question  
 * - updateSessionState: Handle pause/resume/end actions
 * - getActiveSession: Retrieve current session state for recovery
 * 
 * Uses existing Prisma schema fields:
 * - endTime === null → Active session
 * - endTime !== null → Completed session
 * - history JSON → Conversation state
 */

import { createCaller } from '~/server/api/root';
import { appRouter, type AppRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { db } from '~/server/db';
import type { User, JdResumeText, SessionData } from '@prisma/client';

// Mock NextAuth.js
import { auth as actualAuth } from '~/server/auth';
jest.mock('~/server/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));
const mockedAuth = actualAuth as jest.MockedFunction<typeof actualAuth>;

// Mock Gemini AI Service
jest.mock('~/lib/gemini', () => ({
  getFirstQuestion: jest.fn(),
  getNextQuestion: jest.fn(),
  continueInterview: jest.fn(),
}));
import { getFirstQuestion, getNextQuestion, continueInterview } from '~/lib/gemini';
const mockGetFirstQuestion = getFirstQuestion as jest.MockedFunction<typeof getFirstQuestion>;
const mockGetNextQuestion = getNextQuestion as jest.MockedFunction<typeof getNextQuestion>;
const mockContinueInterview = continueInterview as jest.MockedFunction<typeof continueInterview>;

describe('Session Live Interview tRPC Router - Phase 3A TDD', () => {
  let testUser: User;
  let testJdResume: JdResumeText;
  let testSession: SessionData;

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
    // For TDD GREEN phase: Use mock auth user ID to avoid mismatch
    // The test auth system uses 'dev-user-123' in development mode
    const mockUserId = 'dev-user-123';
    
    // Set up test user with the same ID as mock auth
    testUser = await db.user.upsert({
      where: { id: mockUserId },
      create: {
        id: mockUserId,
        email: 'test-live@example.com',
        name: 'Live Test User',
      },
      update: {
        email: 'test-live@example.com',
        name: 'Live Test User',
      },
    });

    // Set up test JD/Resume data
    testJdResume = await db.jdResumeText.create({
      data: {
        userId: testUser.id,
        jdText: 'Senior Software Engineer position requiring React and Node.js experience',
        resumeText: 'Experienced developer with 5 years in full-stack development',
      },
    });

    // Set up test session for live interview (using current schema)
    testSession = await db.sessionData.create({
      data: {
        userId: testUser.id,
        jdResumeTextId: testJdResume.id,
        personaId: 'swe-interviewer-standard', // Use actual persona ID
        history: [],
        startTime: new Date(),
        endTime: null, // Active session
        durationInSeconds: 3600, // 1 hour session
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.sessionData.deleteMany({ where: { userId: testUser.id } });
    await db.jdResumeText.deleteMany({ where: { userId: testUser.id } });
    await db.user.delete({ where: { id: testUser.id } });
    await db.$disconnect();
  });

  beforeEach(async () => {
    // Reset mocks for each test
    jest.clearAllMocks();
    // Note: Auth setup is now handled per-test via getTestCaller()
  });

  // 🔴 RED PHASE: Test startInterviewSession procedure
  describe('startInterviewSession procedure - TDD RED Phase', () => {
    it('should initialize session with persona and generate first question', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      const personaId = 'swe-interviewer-standard'; // Use actual persona ID
      
      // Mock AI service response
      mockGetFirstQuestion.mockResolvedValue({
        questionText: 'Tell me about your experience with React.',
        rawAiResponseText: 'Mock AI response',
      });

      // Act
      const result = await caller.session.startInterviewSession({
        sessionId: testSession.id,
        personaId,
      });

      // Assert
      expect(result).toMatchObject({
        sessionId: testSession.id,
        isActive: true,
        personaId,
        currentQuestion: 'Tell me about your experience with React.',
        questionNumber: 1,
        totalQuestions: 10,
        timeRemaining: expect.any(Number),
        conversationHistory: [],
      });

      // Verify AI service was called with correct parameters
      expect(mockGetFirstQuestion).toHaveBeenCalledWith(
        testJdResume, // Full JdResumeText object
        expect.objectContaining({ id: personaId })
      );
    });

    it('should reject starting session for different user', async () => {
      // Arrange: Mock different user
      const uniqueEmail = `other-${Date.now()}@example.com`;
      const otherUser = await db.user.create({
        data: { email: uniqueEmail, name: 'Other User' },
      });
      
      const caller = await getTestCaller(otherUser);

      // Act & Assert: Should throw authorization error
      await expect(
        caller.session.startInterviewSession({
          sessionId: testSession.id,
          personaId: 'swe-interviewer-standard', // Use actual persona ID
        })
      ).rejects.toThrow('Not authorized to access this session');

      // Cleanup
      await db.user.delete({ where: { id: otherUser.id } });
    });

    it('should reject starting already completed session', async () => {
      // Arrange: Mark session as completed (endTime !== null)
      await db.sessionData.update({
        where: { id: testSession.id },
        data: { 
          endTime: new Date(), // Session completed
          overallSummary: 'Interview completed'
        },
      });

      const caller = await getTestCaller(testUser);

      // Act & Assert: Should reject starting completed session
      await expect(
        caller.session.startInterviewSession({
          sessionId: testSession.id,
          personaId: 'technical-interviewer',
        })
      ).rejects.toThrow('Session is already completed');

      // Reset session to active for other tests
      await db.sessionData.update({
        where: { id: testSession.id },
        data: { endTime: null, overallSummary: null },
      });
    });
  });

  // 🔴 RED PHASE: Test getNextQuestion procedure
  describe('getNextQuestion procedure - TDD RED Phase', () => {
    it('should process user response and generate next question', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      const userResponse = 'I have been working with React for 3 years, building scalable web applications.';
      
      // Mock AI service response
      mockContinueInterview.mockResolvedValue({
        nextQuestion: 'Can you describe a challenging React project you worked on?',
        analysis: 'Good experience level mentioned',
        feedbackPoints: ['Clear timeline provided'],
        suggestedAlternative: undefined,
        rawAiResponseText: 'Mock AI response',
      });

      // Act
      const result = await caller.session.getNextQuestion({
        sessionId: testSession.id,
        userResponse,
      });

      // Assert
      expect(result).toMatchObject({
        nextQuestion: 'Can you describe a challenging React project you worked on?',
        questionNumber: expect.any(Number),
        isComplete: false,
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: userResponse }),
        ]),
      });

      // Verify AI service called with conversation context
      expect(mockContinueInterview).toHaveBeenCalledWith(
        expect.objectContaining({ jdText: expect.any(String) }), // JdResumeText object
        expect.objectContaining({ id: 'swe-interviewer-standard' }), // Persona object
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', text: userResponse }),
        ]), // History array
        userResponse // Current user response
      );
    });

    it('should mark session as complete when interview finished', async () => {
      // Arrange: Session near completion
      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          endTime: null, // Still active
          history: Array(9).fill(null).map((_, i) => ({
            id: `turn-${i + 1}-${i % 2 === 0 ? 'model' : 'user'}`,
            role: i % 2 === 0 ? 'model' : 'user', // Use 'model' instead of 'ai'
            text: `Question/Answer ${i + 1}`, // Use 'text' instead of 'content'
            timestamp: new Date().toISOString(),
          })),
        },
      });

      mockContinueInterview.mockResolvedValue({
        nextQuestion: undefined, // Indicates completion
        analysis: 'Interview completed',
        feedbackPoints: [],
        suggestedAlternative: undefined,
        rawAiResponseText: 'Interview completed',
      });

      const caller = await getTestCaller(testUser);

      // Act
      const result = await caller.session.getNextQuestion({
        sessionId: testSession.id,
        userResponse: 'My final answer to wrap up the interview.',
      });

      // Assert
      expect(result).toMatchObject({
        nextQuestion: undefined,
        isComplete: true,
      });

      // Verify session marked as completed (endTime !== null)
      const completedSession = await db.sessionData.findUnique({
        where: { id: testSession.id },
      });
      expect(completedSession?.endTime).toBeTruthy();
    });
  });

  // 🔴 RED PHASE: Test updateSessionState procedure
  describe('updateSessionState procedure - TDD RED Phase', () => {
    it('should pause active session by storing state in history', async () => {
      // Arrange: Active session
      await db.sessionData.update({
        where: { id: testSession.id },
        data: { 
          endTime: null, // Active
          personaId: 'swe-interviewer-standard', // Use actual persona ID
          history: [
            {
              id: 'turn-1-model',
              role: 'model', // Use 'model' instead of 'ai'
              text: 'Current question in progress', // Use 'text' instead of 'content'
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });

      const caller = await getTestCaller(testUser);

      // Act: This will FAIL initially
      const result = await caller.session.updateSessionState({
        sessionId: testSession.id,
        action: 'pause',
        currentResponse: 'I was in the middle of answering...',
      });

      // Assert
      expect(result).toMatchObject({
        isPaused: true,
        lastActivityTime: expect.any(String),
      });

      // Verify pause state stored in history JSON
      const pausedSession = await db.sessionData.findUnique({
        where: { id: testSession.id },
      });
      const history = pausedSession?.history as { type?: string; text?: string }[];
      expect(history).toContainEqual(
        expect.objectContaining({
          type: 'pause',
          text: 'I was in the middle of answering...',
        })
      );
    });

    it('should resume paused session', async () => {
      // Arrange: Paused session (with pause event in history)
      await db.sessionData.update({
        where: { id: testSession.id },
        data: { 
          endTime: null, // Still active, just paused
          history: [
            {
              role: 'ai',
              content: 'Question before pause',
              timestamp: new Date().toISOString(),
            },
            {
              type: 'pause',
              content: 'Partial response',
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });

      const caller = await getTestCaller(testUser);

      // Act
      const result = await caller.session.updateSessionState({
        sessionId: testSession.id,
        action: 'resume',
      });

      // Assert
      expect(result).toMatchObject({
        isPaused: false,
        lastActivityTime: expect.any(String),
      });
    });

    it('should end session and set completion time', async () => {
      // Arrange: Active session
      await db.sessionData.update({
        where: { id: testSession.id },
        data: { endTime: null }, // Active
      });

      const caller = await getTestCaller(testUser);

      // Act
      const result = await caller.session.updateSessionState({
        sessionId: testSession.id,
        action: 'end',
      });

      // Assert
      expect(result).toMatchObject({
        isCompleted: true,
        endTime: expect.any(String),
      });

      // Verify database updated with endTime
      const endedSession = await db.sessionData.findUnique({
        where: { id: testSession.id },
      });
      expect(endedSession?.endTime).toBeTruthy();
    });
  });

  // 🔴 RED PHASE: Test getActiveSession procedure
  describe('getActiveSession procedure - TDD RED Phase', () => {
    it('should retrieve current session state for recovery', async () => {
      // Arrange: Set up active session with conversation history
      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          endTime: null, // Active session
          personaId: 'behavioral-interviewer-friendly', // Use actual persona ID
          history: [
            {
              role: 'ai',
              content: 'Tell me about yourself.',
              timestamp: new Date().toISOString(),
            },
            {
              role: 'user',
              content: 'I am a software engineer.',
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });

      const caller = await getTestCaller(testUser);

      // Act
      const result = await caller.session.getActiveSession({
        sessionId: testSession.id,
      });

      // Assert
      expect(result).toMatchObject({
        sessionId: testSession.id,
        isActive: true, // endTime === null
        personaId: 'behavioral-interviewer-friendly', // Use actual persona ID
        currentQuestion: expect.any(String),
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({ role: 'ai', content: 'Tell me about yourself.' }),
          expect.objectContaining({ role: 'user', content: 'I am a software engineer.' }),
        ]),
        questionNumber: expect.any(Number),
        timeRemaining: expect.any(Number),
      });
    });

    it('should return null for non-existent session', async () => {
      const caller = await getTestCaller(testUser);

      // Act & Assert
      await expect(
        caller.session.getActiveSession({
          sessionId: 'non-existent-session',
        })
      ).rejects.toThrow('Session not found');
    });

    it('should reject access to other user session', async () => {
      // Arrange: Different user session
      const uniqueEmail = `other2-${Date.now()}@example.com`;
      const otherUser = await db.user.create({
        data: { email: uniqueEmail, name: 'Other User 2' },
      });

      const otherSession = await db.sessionData.create({
        data: {
          userId: otherUser.id,
          jdResumeTextId: testJdResume.id, // Can reference same JD/Resume
          personaId: 'technical-interviewer',
          history: [],
          startTime: new Date(),
          endTime: null, // Active
          durationInSeconds: 3600,
        },
      });

      const caller = await getTestCaller(testUser); // Using testUser auth

      // Act & Assert: Should throw authorization error
      await expect(
        caller.session.getActiveSession({
          sessionId: otherSession.id,
        })
      ).rejects.toThrow('Not authorized to access this session');

      // Cleanup
      await db.sessionData.delete({ where: { id: otherSession.id } });
      await db.user.delete({ where: { id: otherUser.id } });
    });
  });
}); 