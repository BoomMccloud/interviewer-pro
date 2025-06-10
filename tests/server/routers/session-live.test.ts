/**
 * Phase 3A: Live Interview Session TDD Tests - QuestionSegments Migration
 * 
 * This file implements TDD for the core live interview functionality using the new QuestionSegments architecture:
 * - startInterviewSession: Initialize session with persona and first question
 * - submitResponse: Process user response with conversational follow-up  
 * - getNextTopicalQuestion: User-controlled topic transitions
 * - getActiveSession: Retrieve current session state for recovery
 * - saveSession: Save session progress
 * 
 * Uses QuestionSegments schema:
 * - endTime === null → Active session
 * - endTime !== null → Completed session
 * - questionSegments JSON → Structured conversation by topic
 * - currentQuestionIndex → Active question pointer
 */

import { createCaller } from '~/server/api/root';
import { appRouter, type AppRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { db } from '~/server/db';
import type { User, JdResumeText, SessionData, Prisma } from '@prisma/client';
import type { QuestionSegment } from '~/types';

// Mock NextAuth.js
import { auth as actualAuth } from '~/server/auth';
jest.mock('~/server/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));
const mockedAuth = actualAuth as jest.MockedFunction<typeof actualAuth>;

// Mock Gemini AI Service - Updated for new procedures
jest.mock('~/lib/gemini', () => ({
  getFirstQuestion: jest.fn(),
  continueConversation: jest.fn(),
  getNewTopicalQuestion: jest.fn(),
}));
import { getFirstQuestion, continueConversation, getNewTopicalQuestion } from '~/lib/gemini';
const mockGetFirstQuestion = getFirstQuestion as jest.MockedFunction<typeof getFirstQuestion>;
const mockContinueConversation = continueConversation as jest.MockedFunction<typeof continueConversation>;
const mockGetNewTopicalQuestion = getNewTopicalQuestion as jest.MockedFunction<typeof getNewTopicalQuestion>;

describe('Session Live Interview tRPC Router - QuestionSegments Migration', () => {
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
  });

  beforeEach(async () => {
    // Create fresh test session for each test with QuestionSegments structure
    testSession = await db.sessionData.create({
      data: {
        userId: testUser.id,
        jdResumeTextId: testJdResume.id,
        personaId: 'swe-interviewer-standard',
        questionSegments: [], // QuestionSegments structure
        currentQuestionIndex: 0,
        startTime: new Date(),
        endTime: null, // Active session
        durationInSeconds: 3600, // 1 hour session
      },
    });

    // Reset mocks for each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test session after each test
    if (testSession?.id) {
      await db.sessionData.delete({ where: { id: testSession.id } });
    }
  });

  afterAll(async () => {
    // Clean up test data
    await db.sessionData.deleteMany({ where: { userId: testUser.id } });
    await db.jdResumeText.deleteMany({ where: { userId: testUser.id } });
    await db.user.delete({ where: { id: testUser.id } });
    await db.$disconnect();
  });

  // ✅ Test startInterviewSession procedure (already working)
  describe('startInterviewSession procedure - QuestionSegments', () => {
    it('should initialize session with persona and generate first question', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      const personaId = 'swe-interviewer-standard';
      
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
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({
            role: 'ai',
            content: 'Tell me about your experience with React.',
            messageType: 'question',
          }),
        ]),
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
          personaId: 'swe-interviewer-standard',
        })
      ).rejects.toThrow('Not authorized to access this session');

      // Cleanup
      await db.user.delete({ where: { id: otherUser.id } });
    });
  });

  // ✅ Test submitResponse procedure (new QuestionSegments)
  describe('submitResponse procedure - QuestionSegments', () => {
    beforeEach(async () => {
      // Set up session with initial question segment
      const initialQuestionSegment: QuestionSegment = {
        questionId: 'q1_opening',
        questionNumber: 1,
        questionType: 'opening',
        question: 'Tell me about your React experience.',
        keyPoints: ['Be specific', 'Use examples', 'Show growth'],
        startTime: new Date().toISOString(),
        endTime: null,
        conversation: [
          {
            role: 'ai',
            content: 'Tell me about your React experience.',
            timestamp: new Date().toISOString(),
            messageType: 'question',
          },
        ],
      };

      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          questionSegments: [initialQuestionSegment] as unknown as Prisma.InputJsonValue,
          currentQuestionIndex: 0,
        },
      });
    });

    it('should process user response and provide conversational follow-up', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      const userResponse = 'I have been working with React for 3 years, building scalable web applications.';
      
      // Mock AI service response
      mockContinueConversation.mockResolvedValue({
        analysis: 'Good experience level mentioned',
        feedbackPoints: ['Clear timeline provided'],
        followUpQuestion: 'Can you describe a challenging React project you worked on?',
        rawAiResponseText: 'Mock AI response',
      });

      // Act
      const result = await caller.session.submitResponse({
        sessionId: testSession.id,
        userResponse,
      });

      // Assert
      expect(result).toMatchObject({
        conversationResponse: 'Can you describe a challenging React project you worked on?',
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({
            role: 'ai',
            content: 'Tell me about your React experience.',
            messageType: 'question',
          }),
          expect.objectContaining({
            role: 'user',
            content: userResponse,
            messageType: 'response',
          }),
          expect.objectContaining({
            role: 'ai',
            content: 'Can you describe a challenging React project you worked on?',
            messageType: 'response',
          }),
        ]),
        canProceedToNextTopic: false, // Less than 4 conversation turns
      });

      // Verify AI service called with conversation context
      expect(mockContinueConversation).toHaveBeenCalledWith(
        testJdResume, // JdResumeText object
        expect.objectContaining({ id: 'swe-interviewer-standard' }), // Persona object
        expect.arrayContaining([
          expect.objectContaining({ role: 'model', text: 'Tell me about your React experience.' }),
          expect.objectContaining({ role: 'user', text: userResponse }),
        ]), // History array
        userResponse // Current user response
      );
    });

    it('should allow topic progression after sufficient conversation', async () => {
      // Arrange: Add more conversation to reach 4+ turns
      const extendedQuestionSegment: QuestionSegment = {
        questionId: 'q1_opening',
        questionNumber: 1,
        questionType: 'opening',
        question: 'Tell me about your React experience.',
        keyPoints: ['Be specific', 'Use examples', 'Show growth'],
        startTime: new Date().toISOString(),
        endTime: null,
        conversation: [
          {
            role: 'ai',
            content: 'Tell me about your React experience.',
            timestamp: new Date().toISOString(),
            messageType: 'question',
          },
          {
            role: 'user',
            content: 'I have 3 years of React experience.',
            timestamp: new Date().toISOString(),
            messageType: 'response',
          },
          {
            role: 'ai',
            content: 'That sounds great! Can you tell me more?',
            timestamp: new Date().toISOString(),
            messageType: 'response',
          },
        ],
      };

      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          questionSegments: [extendedQuestionSegment] as unknown as Prisma.InputJsonValue,
          currentQuestionIndex: 0,
        },
      });

      const caller = await getTestCaller(testUser);
      const userResponse = 'I built several production applications with complex state management.';
      
      mockContinueConversation.mockResolvedValue({
        analysis: 'Good technical depth',
        feedbackPoints: ['Mentions production experience'],
        followUpQuestion: 'What was the most challenging aspect?',
        rawAiResponseText: 'Mock AI response',
      });

      // Act
      const result = await caller.session.submitResponse({
        sessionId: testSession.id,
        userResponse,
      });

      // Assert
      expect(result).toMatchObject({
        conversationResponse: 'What was the most challenging aspect?',
        canProceedToNextTopic: true, // 4+ conversation turns allows topic progression
      });
    });
  });

  // ✅ Test getNextTopicalQuestion procedure (new QuestionSegments)
  describe('getNextTopicalQuestion procedure - QuestionSegments', () => {
    beforeEach(async () => {
      // Set up session with completed first question segment
      const completedQuestionSegment: QuestionSegment = {
        questionId: 'q1_opening',
        questionNumber: 1,
        questionType: 'opening',
        question: 'Tell me about your React experience.',
        keyPoints: ['Be specific', 'Use examples'],
        startTime: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        endTime: null, // Will be set when transitioning
        conversation: [
          {
            role: 'ai',
            content: 'Tell me about your React experience.',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            messageType: 'question',
          },
          {
            role: 'user',
            content: 'I have experience with React and functional components.',
            timestamp: new Date(Date.now() - 240000).toISOString(),
            messageType: 'response',
          },
          {
            role: 'ai',
            content: 'That sounds great! Any specific challenges?',
            timestamp: new Date(Date.now() - 180000).toISOString(),
            messageType: 'response',
          },
          {
            role: 'user',
            content: 'Yes, I worked on performance optimization.',
            timestamp: new Date(Date.now() - 120000).toISOString(),
            messageType: 'response',
          },
        ],
      };

      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          questionSegments: [completedQuestionSegment] as unknown as Prisma.InputJsonValue,
          currentQuestionIndex: 0,
        },
      });
    });

    it('should create new question segment for topic transition', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      
      mockGetNewTopicalQuestion.mockResolvedValue({
        questionText: 'Now let\'s discuss your Node.js experience.',
        keyPoints: ['API design', 'Database integration', 'Performance optimization'],
        rawAiResponseText: 'Mock AI response',
      });

      // Act
      const result = await caller.session.getNextTopicalQuestion({
        sessionId: testSession.id,
      });

      // Assert
      expect(result).toMatchObject({
        isComplete: false,
        message: null,
        totalQuestions: 2,
        questionText: 'Now let\'s discuss your Node.js experience.',
        keyPoints: ['API design', 'Database integration', 'Performance optimization'],
        questionNumber: 2,
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({
            role: 'ai',
            content: 'Now let\'s discuss your Node.js experience.',
            messageType: 'question',
          }),
        ]),
      });

      // Verify previous question was marked as completed
      const updatedSession = await db.sessionData.findUnique({
        where: { id: testSession.id },
      });
      const questionSegments = updatedSession?.questionSegments as unknown as QuestionSegment[];
      expect(questionSegments[0]?.endTime).toBeTruthy(); // First question marked complete
      expect(questionSegments).toHaveLength(2); // New question segment added
    });

    it('should end interview after 3 questions', async () => {
      // Arrange: Set up session with 3 completed question segments
      const threeQuestionSegments: QuestionSegment[] = [
        {
          questionId: 'q1_opening',
          questionNumber: 1,
          questionType: 'opening',
          question: 'Tell me about your React experience.',
          keyPoints: ['Be specific', 'Use examples'],
          startTime: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
          endTime: new Date(Date.now() - 480000).toISOString(), // 8 minutes ago
          conversation: [
            {
              role: 'ai',
              content: 'Tell me about your React experience.',
              timestamp: new Date(Date.now() - 600000).toISOString(),
              messageType: 'question',
            },
            {
              role: 'user',
              content: 'I have 3 years of React experience.',
              timestamp: new Date(Date.now() - 540000).toISOString(),
              messageType: 'response',
            },
          ],
        },
        {
          questionId: 'q2_technical',
          questionNumber: 2,
          questionType: 'technical',
          question: 'How do you handle state management?',
          keyPoints: ['Redux', 'Context API', 'Hooks'],
          startTime: new Date(Date.now() - 480000).toISOString(), // 8 minutes ago
          endTime: new Date(Date.now() - 360000).toISOString(), // 6 minutes ago
          conversation: [
            {
              role: 'ai',
              content: 'How do you handle state management?',
              timestamp: new Date(Date.now() - 480000).toISOString(),
              messageType: 'question',
            },
            {
              role: 'user',
              content: 'I use Redux for complex state and useState for local state.',
              timestamp: new Date(Date.now() - 420000).toISOString(),
              messageType: 'response',
            },
          ],
        },
        {
          questionId: 'q3_behavioral',
          questionNumber: 3,
          questionType: 'behavioral',
          question: 'Describe a challenging project.',
          keyPoints: ['Problem-solving', 'Teamwork', 'Results'],
          startTime: new Date(Date.now() - 360000).toISOString(), // 6 minutes ago
          endTime: null, // Currently active
          conversation: [
            {
              role: 'ai',
              content: 'Describe a challenging project.',
              timestamp: new Date(Date.now() - 360000).toISOString(),
              messageType: 'question',
            },
            {
              role: 'user',
              content: 'I led a team to migrate a legacy system.',
              timestamp: new Date(Date.now() - 300000).toISOString(),
              messageType: 'response',
            },
          ],
        },
      ];

      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          questionSegments: threeQuestionSegments as unknown as Prisma.InputJsonValue,
          currentQuestionIndex: 2, // Currently on the 3rd question (0-indexed)
        },
      });

      const caller = await getTestCaller(testUser);

      // Act: Try to get the next topical question after 3 questions
      const result = await caller.session.getNextTopicalQuestion({
        sessionId: testSession.id,
      });

      // Assert: Interview should be marked as complete
      expect(result).toMatchObject({
        isComplete: true,
        message: 'Interview completed! You have successfully answered 3 questions.',
        totalQuestions: 3,
        questionText: null,
        keyPoints: [],
        questionNumber: null,
        conversationHistory: [],
      });

      // Verify session is marked as completed in database
      const completedSession = await db.sessionData.findUnique({
        where: { id: testSession.id },
      });
      expect(completedSession?.endTime).toBeTruthy(); // Interview marked as completed
      
      // Verify the 3rd question was marked as completed
      const finalQuestionSegments = completedSession?.questionSegments as unknown as QuestionSegment[];
      expect(finalQuestionSegments[2]?.endTime).toBeTruthy(); // 3rd question marked complete
    });
  });

  // ✅ Test getActiveSession procedure (already working with QuestionSegments)
  describe('getActiveSession procedure - QuestionSegments', () => {
    it('should retrieve current session state with QuestionSegments structure', async () => {
      // Arrange: Set up active session with QuestionSegments
      const activeQuestionSegment: QuestionSegment = {
        questionId: 'q1_opening',
        questionNumber: 1,
        questionType: 'opening',
        question: 'Tell me about your experience.',
        keyPoints: ['Be specific', 'Use examples'],
        startTime: new Date().toISOString(),
        endTime: null,
        conversation: [
          {
            role: 'ai',
            content: 'Tell me about your experience.',
            timestamp: new Date().toISOString(),
            messageType: 'question',
          },
          {
            role: 'user',
            content: 'I am a software engineer.',
            timestamp: new Date().toISOString(),
            messageType: 'response',
          },
        ],
      };

      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          endTime: null, // Active session
          personaId: 'swe-interviewer-standard',
          questionSegments: [activeQuestionSegment],
          currentQuestionIndex: 0,
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
        personaId: 'swe-interviewer-standard',
        currentQuestion: 'Tell me about your experience.',
        keyPoints: ['Be specific', 'Use examples'],
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({ role: 'ai', content: 'Tell me about your experience.' }),
          expect.objectContaining({ role: 'user', content: 'I am a software engineer.' }),
        ]),
        questionNumber: 1,
        totalQuestions: 1,
        canProceedToNextTopic: false, // Less than 4 conversation turns
      });
    });

    it('should return error for non-existent session', async () => {
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
          jdResumeTextId: testJdResume.id,
          personaId: 'swe-interviewer-standard',
          questionSegments: [],
          currentQuestionIndex: 0,
          startTime: new Date(),
          endTime: null,
          durationInSeconds: 3600,
        },
      });

      const caller = await getTestCaller(testUser);

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

  // ✅ Test saveSession procedure (already working)
  describe('saveSession procedure - QuestionSegments', () => {
    it('should save session progress successfully', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      
      // Act
      const result = await caller.session.saveSession({
        sessionId: testSession.id,
        currentResponse: 'Work in progress response...',
      });

      // Assert
      expect(result).toMatchObject({
        saved: true,
        ended: false,
        timestamp: expect.any(Date),
      });
    });

    it('should end session when endSession parameter is true', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      
      // Verify session is initially active (endTime should be null)
      const initialSession = await db.sessionData.findUnique({
        where: { id: testSession.id }
      });
      expect(initialSession?.endTime).toBeNull();
      
      // Act: End the session
      const result = await caller.session.saveSession({
        sessionId: testSession.id,
        endSession: true
      });

      // Assert: Response indicates session was ended
      expect(result).toMatchObject({
        saved: true,
        ended: true,
        timestamp: expect.any(Date),
      });
      
      // Verify endTime was set in database
      const endedSession = await db.sessionData.findUnique({
        where: { id: testSession.id }
      });
      expect(endedSession?.endTime).toBeTruthy();
      expect(endedSession?.endTime).toBeInstanceOf(Date);
      
      // Verify endTime is recent (within last few seconds)
      const now = new Date();
      const timeDiff = now.getTime() - endedSession!.endTime!.getTime();
      expect(timeDiff).toBeLessThan(5000); // Less than 5 seconds ago
    });
  });
}); 