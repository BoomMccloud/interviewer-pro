/**
 * @fileoverview Backend Integration Tests for Complete Interview Flow
 * 
 * Tests the entire user journey using QuestionSegments architecture:
 * 1. Session Creation & Initialization  
 * 2. Starting Interview with First Question
 * 3. User Response Submission & AI Follow-ups
 * 4. Topic Transitions (User-Controlled)
 * 5. Session Management (Save/End)
 * 6. Error Handling & Edge Cases
 * 
 * INTEGRATION SCOPE: Backend tRPC + Database + AI Service (No Frontend Components)
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createCaller } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { db } from '~/server/db';
import type { QuestionSegment } from '~/types';
import type { Session } from 'next-auth';

// Mock AI service for predictable testing
const mockGetFirstQuestion = jest.fn();
const mockContinueConversation = jest.fn();
const mockGetNewTopicalQuestion = jest.fn();
const mockParseAiResponse = jest.fn();

jest.mock('~/lib/gemini', () => ({
  getFirstQuestion: mockGetFirstQuestion,
  continueConversation: mockContinueConversation,
  getNewTopicalQuestion: mockGetNewTopicalQuestion,
  parseAiResponse: mockParseAiResponse,
}));

// Mock auth for integration tests
jest.mock('~/server/auth', () => ({
  getServerAuthSession: jest.fn().mockResolvedValue({
    user: { id: 'test-user-id', email: 'test@example.com' },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }),
}));

// Mock getPersona
const mockGetPersona = jest.fn();
jest.mock('~/lib/personaService', () => ({
  getPersona: mockGetPersona,
}));

describe('🔗 Interview Flow Integration Tests', () => {
  let testUserId: string;
  let testJdResumeId: string;
  let testSessionId: string;

  // Helper to create tRPC caller
  const getCaller = async () => {
    const ctx = await createTRPCContext({ headers: new Headers() });
    return createCaller(ctx);
  };

  beforeEach(async () => {
    // Setup test data
    testUserId = 'test-user-id';
    
    // Create test JD/Resume record
    const jdResumeRecord = await db.jdResumeText.create({
      data: {
        userId: testUserId,
        jdText: 'Software Engineer position requiring React and Node.js experience',
        resumeText: 'Experienced developer with 5 years in full-stack development',
      },
    });
    testJdResumeId = jdResumeRecord.id;

    // Mock AI responses for predictable testing
    mockGetPersona.mockResolvedValue({
      id: 'swe-interviewer-standard',
      name: 'Senior Engineer',
      systemPrompt: 'You are a senior software engineer conducting a technical interview.',
    });
    
    mockGetFirstQuestion.mockResolvedValue({
      questionText: 'Tell me about your experience with React and component architecture.',
      rawAiResponseText: 'QUESTION: Tell me about your experience with React and component architecture.\nKEY_POINTS: Focus on specific projects, Component design patterns, State management approaches',
    });

    mockContinueConversation.mockResolvedValue({
      followUpQuestion: 'That sounds interesting! Can you elaborate on the state management challenges you faced?',
      analysis: 'Good response showing depth',
      feedbackPoints: ['Clear communication', 'Relevant examples'],
      rawAiResponseText: 'FOLLOW_UP: That sounds interesting! Can you elaborate on the state management challenges you faced?',
    });

    mockGetNewTopicalQuestion.mockResolvedValue({
      questionText: 'Now let\'s discuss your experience with Node.js and backend development.',
      keyPoints: ['API design', 'Database integration', 'Performance optimization'],
      rawAiResponseText: 'NEW_TOPIC: Now let\'s discuss your experience with Node.js and backend development.',
    });

    mockParseAiResponse.mockReturnValue({
      nextQuestion: 'Tell me about your experience with React and component architecture.',
      keyPoints: ['Focus on specific projects', 'Component design patterns', 'State management approaches'],
      analysis: 'Default analysis',
      feedbackPoints: ['Default feedback'],
      suggestedAlternative: 'Default alternative',
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await db.sessionData.deleteMany({ where: { userId: testUserId } });
    await db.jdResumeText.deleteMany({ where: { userId: testUserId } });
    jest.clearAllMocks();
  });

  describe('📝 Session Creation & Initialization', () => {
    it('should create session and start interview successfully', async () => {
      const caller = await getCaller();
      
      // Test session creation
      const createResult = await caller.session.createSession({
        personaId: 'swe-interviewer-standard',
        durationInSeconds: 1800, // 30 minutes
      });

      expect(createResult).toMatchObject({
        sessionId: expect.any(String),
        firstQuestion: expect.stringContaining('React'),
        rawAiResponseText: expect.any(String),
      });

      testSessionId = createResult.sessionId;

      // Test starting the interview
      const startResult = await caller.session.startInterviewSession({
        sessionId: testSessionId,
        personaId: 'swe-interviewer-standard',
      });

      expect(startResult).toMatchObject({
        sessionId: testSessionId,
        isActive: true,
        personaId: 'swe-interviewer-standard',
        currentQuestion: expect.stringContaining('React'),
        keyPoints: expect.arrayContaining([expect.any(String)]),
        questionNumber: 1,
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({
            role: 'ai',
            content: expect.stringContaining('React'),
            messageType: 'question',
          }),
        ]),
      });
    });

    it('should handle session creation with invalid persona', async () => {
      mockGetPersona.mockResolvedValue(null); // Invalid persona
      
      const caller = await getCaller();
      
      await expect(
        caller.session.createSession({
          personaId: 'invalid_persona',
          durationInSeconds: 1800,
        })
      ).rejects.toThrow(/Persona not found/);
    });
  });

  describe('💬 User Response & AI Follow-up Flow', () => {
    beforeEach(async () => {
      // Create and start session for response testing
      const caller = await getCaller();
      
      const createResult = await caller.session.createSession({
        personaId: 'swe-interviewer-standard',
        durationInSeconds: 1800,
      });
      testSessionId = createResult.sessionId;

      await caller.session.startInterviewSession({
        sessionId: testSessionId,
        personaId: 'swe-interviewer-standard',
      });
    });

    it('should handle user response submission and AI follow-up', async () => {
      const caller = await getCaller();
      const userResponse = 'I have extensive experience with React, having built multiple production applications using functional components, hooks, and context API for state management.';

      const submitResult = await caller.session.submitResponse({
        sessionId: testSessionId,
        userResponse,
      });

      expect(submitResult).toMatchObject({
        conversationResponse: expect.stringContaining('elaborate'),
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: userResponse,
            messageType: 'response',
          }),
          expect.objectContaining({
            role: 'ai',
            content: expect.stringContaining('elaborate'),
            messageType: 'response',
          }),
        ]),
        canProceedToNextTopic: expect.any(Boolean),
      });

      // Verify session state is updated
      const sessionState = await caller.session.getActiveSession({
        sessionId: testSessionId,
      });

      expect(sessionState.conversationHistory).toHaveLength(3); // Initial Q + User response + AI follow-up
    });

    it('should handle empty user response validation', async () => {
      const caller = await getCaller();
      
      await expect(
        caller.session.submitResponse({
          sessionId: testSessionId,
          userResponse: '   ', // Empty/whitespace only
        })
      ).rejects.toThrow(/User response cannot be empty/);
    });
  });

  describe('🎯 Topic Transitions (User-Controlled)', () => {
    beforeEach(async () => {
      // Setup session with some conversation history
      const caller = await getCaller();
      
      const createResult = await caller.session.createSession({
        personaId: 'swe-interviewer-standard',
        durationInSeconds: 1800,
      });
      testSessionId = createResult.sessionId;

      await caller.session.startInterviewSession({
        sessionId: testSessionId,
        personaId: 'swe-interviewer-standard',
      });

      // Add some conversation to current topic
      await caller.session.submitResponse({
        sessionId: testSessionId,
        userResponse: 'I have experience with React hooks and context API.',
      });
    });

    it('should successfully transition to next topic', async () => {
      const caller = await getCaller();
      
      const topicResult = await caller.session.getNextTopicalQuestion({
        sessionId: testSessionId,
      });

      expect(topicResult).toMatchObject({
        questionText: expect.stringContaining('Node.js'),
        keyPoints: expect.arrayContaining(['API design', 'Database integration', 'Performance optimization']),
        questionNumber: 2,
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({
            role: 'ai',
            content: expect.stringContaining('Node.js'),
            messageType: 'question',
          }),
        ]),
      });

      // Verify session state reflects new question
      const sessionState = await caller.session.getActiveSession({
        sessionId: testSessionId,
      });

      expect(sessionState).toMatchObject({
        currentQuestion: expect.stringContaining('Node.js'),
        questionNumber: 2,
        totalQuestions: 2,
      });
    });
  });

  describe('💾 Session Management', () => {
    beforeEach(async () => {
      const caller = await getCaller();
      
      const createResult = await caller.session.createSession({
        personaId: 'swe-interviewer-standard',
        durationInSeconds: 1800,
      });
      testSessionId = createResult.sessionId;

      await caller.session.startInterviewSession({
        sessionId: testSessionId,
        personaId: 'swe-interviewer-standard',
      });
    });

    it('should save session successfully', async () => {
      const caller = await getCaller();
      
      const saveResult = await caller.session.saveSession({
        sessionId: testSessionId,
        currentResponse: 'Work in progress response...',
      });

      expect(saveResult).toMatchObject({
        saved: true,
        timestamp: expect.any(Date),
      });
    });

    it('should retrieve session state correctly', async () => {
      const caller = await getCaller();
      
      const sessionState = await caller.session.getActiveSession({
        sessionId: testSessionId,
      });

      expect(sessionState).toMatchObject({
        sessionId: testSessionId,
        isActive: true,
        personaId: 'swe-interviewer-standard',
        currentQuestion: expect.any(String),
        keyPoints: expect.any(Array),
        conversationHistory: expect.any(Array),
        questionNumber: expect.any(Number),
        totalQuestions: expect.any(Number),
        canProceedToNextTopic: expect.any(Boolean),
      });
    });
  });

  describe('🚨 Error Handling & Edge Cases', () => {
    it('should handle invalid session ID gracefully', async () => {
      const caller = await getCaller();
      
      await expect(
        caller.session.getActiveSession({
          sessionId: 'invalid-session-id',
        })
      ).rejects.toThrow(/Session not found/);
    });

    it('should handle unauthorized session access', async () => {
      // Create session for different user
      const otherUserSession = await db.sessionData.create({
        data: {
          userId: 'other-user-id',
          jdResumeTextId: testJdResumeId,
          personaId: 'swe-interviewer-standard',
          durationInSeconds: 1800,
          questionSegments: [],
          currentQuestionIndex: 0,
        },
      });

      const caller = await getCaller();

      await expect(
        caller.session.getActiveSession({
          sessionId: otherUserSession.id,
        })
      ).rejects.toThrow(/Not authorized/);
    });

    it('should handle AI service failures gracefully', async () => {
      mockContinueConversation.mockRejectedValue(new Error('AI service unavailable'));

      const caller = await getCaller();
      
      const createResult = await caller.session.createSession({
        personaId: 'swe-interviewer-standard',
        durationInSeconds: 1800,
      });
      testSessionId = createResult.sessionId;

      await caller.session.startInterviewSession({
        sessionId: testSessionId,
        personaId: 'swe-interviewer-standard',
      });

      await expect(
        caller.session.submitResponse({
          sessionId: testSessionId,
          userResponse: 'Test response',
        })
      ).rejects.toThrow(/AI service unavailable/);
    });
  });

  describe('📊 Data Integrity & QuestionSegments Validation', () => {
    it('should maintain proper QuestionSegments structure', async () => {
      const caller = await getCaller();
      
      const createResult = await caller.session.createSession({
        personaId: 'swe-interviewer-standard',
        durationInSeconds: 1800,
      });
      testSessionId = createResult.sessionId;

      await caller.session.startInterviewSession({
        sessionId: testSessionId,
        personaId: 'swe-interviewer-standard',
      });

      // Submit response to create conversation history
      await caller.session.submitResponse({
        sessionId: testSessionId,
        userResponse: 'Test response about React experience',
      });

      // Verify database structure
      const dbSession = await db.sessionData.findUnique({
        where: { id: testSessionId },
      });

      expect(dbSession?.questionSegments).toBeDefined();
      
      // Safe type assertion with proper validation
      const questionSegments = dbSession?.questionSegments;
      expect(Array.isArray(questionSegments)).toBe(true);
      expect(questionSegments).toHaveLength(1);
      
      const firstSegment = (questionSegments as QuestionSegment[])[0];
      expect(firstSegment).toMatchObject({
        questionId: expect.any(String),
        questionNumber: 1,
        questionType: 'opening',
        question: expect.stringContaining('React'),
        keyPoints: expect.any(Array),
        startTime: expect.any(String),
        endTime: null, // Still active
        conversation: expect.arrayContaining([
          expect.objectContaining({
            role: 'ai',
            content: expect.any(String),
            messageType: 'question',
          }),
          expect.objectContaining({
            role: 'user',
            content: 'Test response about React experience',
            messageType: 'response',
          }),
        ]),
      });
    });
  });
}); 