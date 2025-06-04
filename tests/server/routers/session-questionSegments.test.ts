import { createCallerFactory } from '~/server/api/trpc';
import { appRouter } from '~/server/api/root';
import { db } from '~/server/db';
import { auth as actualAuth } from '~/server/auth';
import type { User, JdResumeText, SessionData } from '@prisma/client';

// Mock dependencies
jest.mock('~/server/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));
const mockedAuth = actualAuth as jest.MockedFunction<typeof actualAuth>;

jest.mock('~/lib/gemini', () => ({
  getFirstQuestion: jest.fn(),
  continueConversation: jest.fn(),
  getNewTopicalQuestion: jest.fn(),
}));

import { getFirstQuestion, continueConversation, getNewTopicalQuestion } from '~/lib/gemini';
const mockGetFirstQuestion = getFirstQuestion as jest.MockedFunction<typeof getFirstQuestion>;
const mockContinueConversation = continueConversation as jest.MockedFunction<typeof continueConversation>;
const mockGetNewTopicalQuestion = getNewTopicalQuestion as jest.MockedFunction<typeof getNewTopicalQuestion>;

jest.mock('~/lib/personaService', () => ({
  getPersona: jest.fn(),
}));
import { getPersona } from '~/lib/personaService';
const mockGetPersona = getPersona as jest.MockedFunction<typeof getPersona>;

describe('Session QuestionSegments Migration - TDD', () => {
  let testUser: User;
  let testJdResume: JdResumeText;
  let testSession: SessionData;

  const getTestCaller = (session: any = null) => {
    const ctx = { db, session, headers: new Headers() };
    return createCallerFactory(appRouter)(ctx);
  };

  beforeAll(async () => {
    // Create test user and data
    testUser = await db.user.create({
      data: {
        id: 'test-user-segments',
        email: 'test-segments@example.com',
        name: 'Test User Segments',
      },
    });

    testJdResume = await db.jdResumeText.create({
      data: {
        id: 'test-jd-segments',
        jdText: 'Senior Software Engineer position...',
        resumeText: 'Experienced developer with 5+ years...',
        userId: testUser.id,
      },
    });

    testSession = await db.sessionData.create({
      data: {
        id: 'test-session-segments',
        personaId: 'hr-recruiter-general',
        durationInSeconds: 1800,
        questionSegments: [], // Start empty
        currentQuestionIndex: 0,
        userId: testUser.id,
        jdResumeTextId: testJdResume.id,
      },
    });
  });

  afterAll(async () => {
    await db.sessionData.deleteMany({ where: { userId: testUser.id } });
    await db.jdResumeText.deleteMany({ where: { userId: testUser.id } });
    await db.user.delete({ where: { id: testUser.id } });
    await db.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue({
      user: testUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  describe('🔴 RED: startInterviewSession with QuestionSegments', () => {
    it('should create first question segment and return structured data', async () => {
      // Arrange - This test will FAIL initially
      mockGetPersona.mockResolvedValue({
        id: 'hr-recruiter-general',
        name: 'HR Recruiter',
        systemPrompt: 'You are a friendly HR recruiter...',
      });

      mockGetFirstQuestion.mockResolvedValue({
        questionText: 'Tell me about yourself and walk me through your resume.',
        rawAiResponseText: '<QUESTION>Tell me about yourself and walk me through your resume.</QUESTION><KEY_POINTS>\n- Your background and experience\n- Your motivation for this role\n- Your relevant skills</KEY_POINTS><ANALYSIS>N/A</ANALYSIS><FEEDBACK>N/A</FEEDBACK><SUGGESTED_ALTERNATIVE>N/A</SUGGESTED_ALTERNATIVE>',
      });

      const caller = await getTestCaller({
        user: testUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act - This will fail because procedures don't exist yet
      const result = await caller.session.startInterviewSession({
        sessionId: testSession.id,
        personaId: 'hr-recruiter-general',
      });

      // Assert - Expected structure for QuestionSegments
      expect(result).toMatchObject({
        sessionId: testSession.id,
        isActive: true,
        personaId: 'hr-recruiter-general',
        currentQuestion: 'Tell me about yourself and walk me through your resume.',
        keyPoints: ['Focus on your specific role and contributions', 'Highlight technologies and tools you used', 'Discuss challenges faced and how you overcame them'],
        questionNumber: 1,
        conversationHistory: [
          {
            role: 'ai',
            content: 'Tell me about yourself and walk me through your resume.',
            messageType: 'question',
          },
        ],
      });

      // Verify database state - QuestionSegments structure
      const updatedSession = await db.sessionData.findUnique({
        where: { id: testSession.id },
      });

      expect(updatedSession?.questionSegments).toEqual([
        {
          questionId: 'q1_opening',
          questionNumber: 1,
          questionType: 'opening',
          question: 'Tell me about yourself and walk me through your resume.',
          keyPoints: ['Focus on your specific role and contributions', 'Highlight technologies and tools you used', 'Discuss challenges faced and how you overcame them'],
          startTime: expect.any(String),
          endTime: null,
          conversation: [
            {
              role: 'ai',
              content: 'Tell me about yourself and walk me through your resume.',
              timestamp: expect.any(String),
              messageType: 'question',
            },
          ],
        },
      ]);
      expect(updatedSession?.currentQuestionIndex).toBe(0);
    });
  });

  describe('🔴 RED: submitResponse with QuestionSegments', () => {
    it('should add user response to current question segment conversation', async () => {
      // Arrange - Setup session with existing question segment
      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          questionSegments: [
            {
              questionId: 'q1_opening',
              questionNumber: 1,
              questionType: 'opening',
              question: 'Tell me about yourself.',
              keyPoints: ['Background', 'Experience'],
              startTime: new Date().toISOString(),
              endTime: null,
              conversation: [
                {
                  role: 'ai',
                  content: 'Tell me about yourself.',
                  timestamp: new Date().toISOString(),
                  messageType: 'question',
                },
              ],
            },
          ],
          currentQuestionIndex: 0,
        },
      });

      mockGetPersona.mockResolvedValue({
        id: 'hr-recruiter-general',
        name: 'HR Recruiter',
        systemPrompt: 'You are a friendly HR recruiter...',
      });

      mockContinueConversation.mockResolvedValue({
        followUpQuestion: 'Great! Can you tell me more about your favorite project?',
        analysis: 'Good engagement with the question',
        feedbackPoints: ['Clear introduction', 'Good structure'],
        rawAiResponseText: 'Raw AI response...'
      });

      const caller = await getTestCaller({
        user: testUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act - This will fail because submitResponse doesn't exist yet
      const result = await caller.session.submitResponse({
        sessionId: testSession.id,
        userResponse: 'I am a software engineer with 5+ years experience.',
      });

      // Assert - Expected conversational response
      expect(result).toMatchObject({
        conversationResponse: 'Great! Can you tell me more about your favorite project?',
        conversationHistory: [
          {
            role: 'ai',
            content: 'Tell me about yourself.',
            messageType: 'question',
          },
          {
            role: 'user',
            content: 'I am a software engineer with 5+ years experience.',
            messageType: 'response',
          },
          {
            role: 'ai',
            content: 'Great! Can you tell me more about your favorite project?',
            messageType: 'response',
          },
        ],
        canProceedToNextTopic: false, // Less than 4 conversation turns
      });

      // Verify database - Conversation added to current question segment
      const updatedSession = await db.sessionData.findUnique({
        where: { id: testSession.id },
      });
      const questionSegments = updatedSession?.questionSegments as any[];
      expect(questionSegments[0].conversation).toHaveLength(3);
    });
  });

  describe('🔴 RED: getNextTopicalQuestion with QuestionSegments', () => {
    it('should mark current question complete and create new question segment', async () => {
      // Arrange - Session with completed conversation
      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          questionSegments: [
            {
              questionId: 'q1_opening',
              questionNumber: 1,
              questionType: 'opening',
              question: 'Tell me about yourself.',
              keyPoints: ['Background'],
              startTime: new Date().toISOString(),
              endTime: null,
              conversation: [
                { role: 'ai', content: 'Question 1', messageType: 'question', timestamp: new Date().toISOString() },
                { role: 'user', content: 'Response 1', messageType: 'response', timestamp: new Date().toISOString() },
                { role: 'ai', content: 'Follow up 1', messageType: 'response', timestamp: new Date().toISOString() },
                { role: 'user', content: 'Response 2', messageType: 'response', timestamp: new Date().toISOString() },
              ],
            },
          ],
          currentQuestionIndex: 0,
        },
      });

      mockGetPersona.mockResolvedValue({
        id: 'hr-recruiter-general',
        name: 'HR Recruiter',
        systemPrompt: 'You are a friendly HR recruiter...',
      });

      mockGetNewTopicalQuestion.mockResolvedValue({
        questionText: 'Describe a challenging technical problem you solved.',
        keyPoints: ['Problem description', 'Solution approach', 'Technologies used'],
        rawAiResponseText: 'Raw AI response...',
      });

      const caller = await getTestCaller({
        user: testUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act - This will fail because getNextTopicalQuestion doesn't exist yet
      const result = await caller.session.getNextTopicalQuestion({
        sessionId: testSession.id,
      });

      // Assert - New topical question
      expect(result).toMatchObject({
        questionText: 'Describe a challenging technical problem you solved.',
        keyPoints: ['Problem description', 'Solution approach', 'Technologies used'],
        questionNumber: 2,
        conversationHistory: [
          {
            role: 'ai',
            content: 'Describe a challenging technical problem you solved.',
            messageType: 'question',
          },
        ],
      });

      // Verify database - New question segment added
      const updatedSession = await db.sessionData.findUnique({
        where: { id: testSession.id },
      });
      const questionSegments = updatedSession?.questionSegments as any[];
      expect(questionSegments).toHaveLength(2);
      expect(questionSegments[0].endTime).not.toBeNull(); // First question marked complete
      expect(questionSegments[1].questionNumber).toBe(2);
      expect(updatedSession?.currentQuestionIndex).toBe(1);
    });
  });

  describe('🔴 RED: getActiveSession with QuestionSegments', () => {
    it('should return current question segment data and conversation history', async () => {
      // Arrange - Session with active question
      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          questionSegments: [
            {
              questionId: 'q1_opening',
              questionNumber: 1,
              questionType: 'opening',
              question: 'Current active question',
              keyPoints: ['Key point 1', 'Key point 2'],
              startTime: new Date().toISOString(),
              endTime: null,
              conversation: [
                { role: 'ai', content: 'Current active question', messageType: 'question', timestamp: new Date().toISOString() },
                { role: 'user', content: 'User response', messageType: 'response', timestamp: new Date().toISOString() },
              ],
            },
          ],
          currentQuestionIndex: 0,
          endTime: null, // Active session
        },
      });

      const caller = await getTestCaller({
        user: testUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act - This will fail because getActiveSession doesn't use QuestionSegments yet
      const result = await caller.session.getActiveSession({
        sessionId: testSession.id,
      });

      // Assert - Current question segment data
      expect(result).toMatchObject({
        sessionId: testSession.id,
        isActive: true,
        currentQuestion: 'Current active question',
        keyPoints: ['Key point 1', 'Key point 2'],
        conversationHistory: [
          { role: 'ai', content: 'Current active question', messageType: 'question', timestamp: expect.any(String) },
          { role: 'user', content: 'User response', messageType: 'response', timestamp: expect.any(String) },
        ],
        questionNumber: 1,
        totalQuestions: 1,
        canProceedToNextTopic: false, // Less than 4 conversation turns
      });
    });
  });

  describe('🔴 RED: saveSession with QuestionSegments', () => {
    it('should save session without modifying conversation history', async () => {
      // Arrange - Session with existing conversation
      await db.sessionData.update({
        where: { id: testSession.id },
        data: {
          questionSegments: [
            {
              questionId: 'q1_opening',
              questionNumber: 1,
              questionType: 'opening',
              question: 'Test question',
              keyPoints: ['Test point'],
              startTime: new Date().toISOString(),
              endTime: null,
              conversation: [
                { role: 'ai', content: 'Test question', messageType: 'question', timestamp: new Date().toISOString() },
              ],
            },
          ],
          currentQuestionIndex: 0,
        },
      });

      const caller = await getTestCaller({
        user: testUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Act - This will fail because saveSession doesn't exist yet
      const result = await caller.session.saveSession({
        sessionId: testSession.id,
        currentResponse: 'Partial response in progress...',
      });

      // Assert - Save confirmation
      expect(result).toMatchObject({
        saved: true,
        timestamp: expect.any(Date),
      });

      // Verify database - No conversation changes, just updated timestamp
      const updatedSession = await db.sessionData.findUnique({
        where: { id: testSession.id },
      });
      const questionSegments = updatedSession?.questionSegments as any[];
      expect(questionSegments[0].conversation).toHaveLength(1); // No new conversation added
      expect(updatedSession?.updatedAt).toBeInstanceOf(Date);
    });
  });
}); 