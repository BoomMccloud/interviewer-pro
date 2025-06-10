/**
 * Test suite for the Session tRPC Router (src/server/api/routers/session.ts).
 *
 * This suite focuses on integration-testing the tRPC procedures related to sessions,
 * such as creating sessions, retrieving session state, submitting answers,
 * and getting report data.
 *
 * UPDATED FOR QUESTIONSEGMENTS ARCHITECTURE:
 * - Uses QuestionSegments structure instead of legacy history field
 * - Tests only non-deprecated procedures
 * - Aligns with current working session router implementation
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
import type { MvpSessionTurn, MvpAiResponse, Persona, QuestionSegment } from '~/types'; // Updated to include QuestionSegment
import { zodMvpSessionTurnArray, zodQuestionSegmentArray } from '~/types'; // Added QuestionSegments validation
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
  continueConversation: jest.fn(), // Added for QuestionSegments procedures
  getNewTopicalQuestion: jest.fn(), // Added for QuestionSegments procedures
  parseAiResponse: jest.fn(), // Added for QuestionSegments procedures
}));

// Mock '~/lib/personaService'
jest.mock('~/lib/personaService', () => ({
  __esModule: true,
  getPersona: jest.fn(),
}));

// Import the mocked functions to get references to them for tests
import { getFirstQuestion, continueConversation, getNewTopicalQuestion, parseAiResponse } from '~/lib/gemini';
import { getPersona } from '~/lib/personaService';

// Cast them to jest.MockedFunction for type safety with mock methods
const mockGetFirstQuestionFn = getFirstQuestion as jest.MockedFunction<typeof getFirstQuestion>;
const mockContinueConversationFn = continueConversation as jest.MockedFunction<typeof continueConversation>;
const mockGetNewTopicalQuestionFn = getNewTopicalQuestion as jest.MockedFunction<typeof getNewTopicalQuestion>;
const mockParseAiResponseFn = parseAiResponse as jest.MockedFunction<typeof parseAiResponse>;
const mockGetPersonaFn = getPersona as jest.MockedFunction<typeof getPersona>;

const MOCK_PERSONA_ID = 'swe-interviewer-standard'; // Updated to use valid persona ID
const MOCK_PERSONA_OBJECT: Persona = {
  id: MOCK_PERSONA_ID,
  name: 'Test Persona',
  systemPrompt: 'You are a test persona.',
};

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
    mockContinueConversationFn.mockReset();
    mockGetNewTopicalQuestionFn.mockReset();
    mockParseAiResponseFn.mockReset();
    mockGetPersonaFn.mockReset();
    (mockedAuth as jest.Mock).mockReset(); // Reset the auth mock

    // Setup default resolved values for mocks
    mockGetPersonaFn.mockResolvedValue(MOCK_PERSONA_OBJECT);
    mockGetFirstQuestionFn.mockResolvedValue({
      questionText: 'Default first question?',
      rawAiResponseText: '<QUESTION>Default first question?</QUESTION>',
    });
    
    // Added mock for parseAiResponse to handle QuestionSegments properly
    mockParseAiResponseFn.mockReturnValue({
      nextQuestion: 'Default first question?',
      keyPoints: ['Focus on your experience', 'Provide specific examples', 'Explain your approach'],
      analysis: 'Default analysis',
      feedbackPoints: ['Default feedback'],
      suggestedAlternative: 'Default alternative',
    });
    
    mockContinueConversationFn.mockResolvedValue({
      followUpQuestion: 'Can you tell me more about that?',
      analysis: 'Good response showing depth',
      feedbackPoints: ['Clear communication', 'Relevant examples'],
      rawAiResponseText: '<FOLLOW_UP>Can you tell me more about that?</FOLLOW_UP>',
    });
    
    mockGetNewTopicalQuestionFn.mockResolvedValue({
      questionText: 'Let\'s move to a new topic. Tell me about your technical skills.',
      keyPoints: ['Technical expertise', 'Problem-solving abilities', 'Learning approach'],
      rawAiResponseText: '<NEW_TOPIC>Let\'s move to a new topic. Tell me about your technical skills.</NEW_TOPIC>',
    });

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
    it('should create a new session with QuestionSegments structure', async () => {
      const caller = await getTestCaller(user);
      const mockInputPersonaId = MOCK_PERSONA_ID;
      const mockFirstQuestionText = 'What is your greatest strength?';
      const mockRawAiResponse = `<QUESTION>${mockFirstQuestionText}</QUESTION>`;

      // Specific mock setup for this test
      mockGetPersonaFn.mockResolvedValue(MOCK_PERSONA_OBJECT);
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
      expect(newSessionFromDb).not.toBeNull();
      expect(newSessionFromDb!.userId).toBe(user.id);
      expect(newSessionFromDb!.jdResumeTextId).toBe(jdResume.id);
      expect(newSessionFromDb!.personaId).toBe(mockInputPersonaId);
      
      // Updated: Check for QuestionSegments structure instead of history
      expect(newSessionFromDb!.questionSegments).toBeDefined();
      expect(Array.isArray(newSessionFromDb!.questionSegments)).toBe(true);
      expect(newSessionFromDb!.currentQuestionIndex).toBe(0);

      expect(result.sessionId).toBe(newSessionFromDb!.id);
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
      // Arrange: Create session with QuestionSegments structure
      const caller = await getTestCaller(user);
      const initialQuestionSegments: QuestionSegment[] = [
        {
          questionId: 'q1_opening',
          questionNumber: 1,
          questionType: 'opening',
          question: 'Initial question',
          keyPoints: ['Focus on experience', 'Be specific'],
          startTime: new Date().toISOString(),
          endTime: null,
          conversation: [
            {
              role: 'ai',
              content: 'Initial question',
              timestamp: new Date().toISOString(),
              messageType: 'question'
            }
          ]
        }
      ];
      
      const createdSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 600,
          questionSegments: initialQuestionSegments as unknown as Prisma.InputJsonValue,
          currentQuestionIndex: 0,
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
      
      // Validate QuestionSegments structure
      expect(result!.questionSegments).toBeDefined();
      expect(result!.currentQuestionIndex).toBe(0);
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
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 300,
          questionSegments: [], // Added required field
          currentQuestionIndex: 0, // Added required field
        },
      });

      const resultForOtherUserSession = await caller.session.getSessionById({ sessionId: otherUserSession.id });
      expect(resultForOtherUserSession).toBeNull();

      // Clean up data created for this specific test scenario
      await db.sessionData.delete({ where: { id: otherUserSession.id } });
      await db.user.delete({ where: { id: otherUser.id } });
    });
  });

  // ==========================================
  // QUESTIONSEGMENTS PROCEDURES TESTS
  // ==========================================

  describe('startInterviewSession procedure', () => {
    it('should initialize session with first question using QuestionSegments', async () => {
      // Arrange: Create empty session first
      const createdSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 1800,
          questionSegments: [],
          currentQuestionIndex: 0,
        },
      });

      const caller = await getTestCaller(user);
      const mockFirstQuestionText = 'Tell me about your experience with React.';
      const mockKeyPoints = [
        "Focus on your specific role and contributions",
        "Highlight technologies and tools you used", 
        "Discuss challenges faced and how you overcame them"
      ];

      // Setup mocks
      mockGetFirstQuestionFn.mockResolvedValue({
        questionText: mockFirstQuestionText,
        rawAiResponseText: `<QUESTION>${mockFirstQuestionText}</QUESTION>`,
      });
      
      mockParseAiResponseFn.mockReturnValue({
        nextQuestion: mockFirstQuestionText,
        keyPoints: mockKeyPoints,
      });

      // Act
      const result = await caller.session.startInterviewSession({
        sessionId: createdSession.id,
        personaId: MOCK_PERSONA_ID,
      });

      // Assert
      expect(result).toMatchObject({
        sessionId: createdSession.id,
        isActive: true,
        personaId: MOCK_PERSONA_ID,
        currentQuestion: mockFirstQuestionText,
        keyPoints: mockKeyPoints,
        questionNumber: 1,
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({
            role: 'ai',
            content: mockFirstQuestionText,
            messageType: 'question',
          }),
        ]),
      });

      // Verify database was updated with QuestionSegments
      const updatedSession = await db.sessionData.findUnique({
        where: { id: createdSession.id },
      });
      
      const questionSegments = zodQuestionSegmentArray.parse(updatedSession!.questionSegments);
      expect(questionSegments).toHaveLength(1);
      expect(questionSegments[0].question).toBe(mockFirstQuestionText);
      expect(questionSegments[0].keyPoints).toEqual(mockKeyPoints);
    });
  });

  describe('submitResponse procedure (QuestionSegments)', () => {
    it('should handle user response and AI follow-up within current topic', async () => {
      // Arrange: Create session with initial question
      const initialQuestionSegment: QuestionSegment = {
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
            messageType: 'question'
          }
        ]
      };

      const createdSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 1800,
          questionSegments: [initialQuestionSegment] as unknown as Prisma.InputJsonValue,
          currentQuestionIndex: 0,
        },
      });

      const caller = await getTestCaller(user);
      const userResponse = 'I have 5 years of experience in full-stack development.';
      const aiFollowUp = 'That\'s great! Can you tell me about a specific challenging project?';

      // Setup mocks
      mockContinueConversationFn.mockResolvedValue({
        followUpQuestion: aiFollowUp,
        analysis: 'Good response showing depth',
        feedbackPoints: ['Clear communication', 'Relevant examples'],
        rawAiResponseText: `<FOLLOW_UP>${aiFollowUp}</FOLLOW_UP>`,
      });

      // Act
      const result = await caller.session.submitResponse({
        sessionId: createdSession.id,
        userResponse,
      });

      // Assert
      expect(result).toMatchObject({
        conversationResponse: aiFollowUp,
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: userResponse,
            messageType: 'response',
          }),
          expect.objectContaining({
            role: 'ai',
            content: aiFollowUp,
            messageType: 'response',
          }),
        ]),
        canProceedToNextTopic: expect.any(Boolean),
      });

      // Verify AI service was called correctly
      expect(mockContinueConversationFn).toHaveBeenCalledWith(
        expect.objectContaining({ id: jdResume.id }),
        MOCK_PERSONA_OBJECT,
        expect.any(Array), // Conversation history in MvpSessionTurn format
        userResponse
      );
    });
  });

  describe('getNextTopicalQuestion procedure (QuestionSegments)', () => {
    it('should create new question segment for topic transition', async () => {
      // Arrange: Create session with completed first question
      const completedQuestionSegment: QuestionSegment = {
        questionId: 'q1_opening',
        questionNumber: 1,
        questionType: 'opening',
        question: 'Tell me about your experience.',
        keyPoints: ['Be specific', 'Use examples'],
        startTime: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        endTime: null, // Will be set when transitioning
        conversation: [
          {
            role: 'ai',
            content: 'Tell me about your experience.',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            messageType: 'question'
          },
          {
            role: 'user',
            content: 'I have experience with React and Node.js.',
            timestamp: new Date(Date.now() - 240000).toISOString(),
            messageType: 'response'
          },
          {
            role: 'ai',
            content: 'That sounds great! Any specific challenges?',
            timestamp: new Date(Date.now() - 180000).toISOString(),
            messageType: 'response'
          },
          {
            role: 'user',
            content: 'Yes, I worked on scaling issues with large datasets.',
            timestamp: new Date(Date.now() - 120000).toISOString(),
            messageType: 'response'
          }
        ]
      };

      const createdSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 1800,
          questionSegments: [completedQuestionSegment] as unknown as Prisma.InputJsonValue,
          currentQuestionIndex: 0,
        },
      });

      const caller = await getTestCaller(user);
      const nextTopicQuestion = 'Now let\'s discuss your experience with databases and data architecture.';
      const nextKeyPoints = ['Database design', 'Query optimization', 'Data modeling'];

      // Setup mocks
      mockGetNewTopicalQuestionFn.mockResolvedValue({
        questionText: nextTopicQuestion,
        keyPoints: nextKeyPoints,
        rawAiResponseText: `<NEW_TOPIC>${nextTopicQuestion}</NEW_TOPIC>`,
      });

      // Act
      const result = await caller.session.getNextTopicalQuestion({
        sessionId: createdSession.id,
      });

      // Assert
      expect(result).toMatchObject({
        questionText: nextTopicQuestion,
        keyPoints: nextKeyPoints,
        questionNumber: 2,
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({
            role: 'ai',
            content: nextTopicQuestion,
            messageType: 'question',
          }),
        ]),
      });

      // Verify database was updated correctly
      const updatedSession = await db.sessionData.findUnique({
        where: { id: createdSession.id },
      });
      
      expect(updatedSession).toBeDefined();
      expect(updatedSession).not.toBeNull();
      const questionSegments = zodQuestionSegmentArray.parse(updatedSession!.questionSegments);
      expect(questionSegments).toHaveLength(2); // Original + new question
      expect(questionSegments[0].endTime).not.toBeNull(); // First question should be marked complete
      expect(questionSegments[1].question).toBe(nextTopicQuestion);
      expect(updatedSession!.currentQuestionIndex).toBe(1); // Should be on new question
    });
  });

  describe('getActiveSession procedure', () => {
    it('should return current session state with QuestionSegments data', async () => {
      // Arrange: Create session with QuestionSegments
      const activeQuestionSegment: QuestionSegment = {
        questionId: 'q1_opening',
        questionNumber: 1,
        questionType: 'opening',
        question: 'What motivates you in your career?',
        keyPoints: ['Personal growth', 'Team collaboration', 'Technical challenges'],
        startTime: new Date().toISOString(),
        endTime: null,
        conversation: [
          {
            role: 'ai',
            content: 'What motivates you in your career?',
            timestamp: new Date().toISOString(),
            messageType: 'question'
          }
        ]
      };

      const createdSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 1800,
          questionSegments: [activeQuestionSegment] as unknown as Prisma.InputJsonValue,
          currentQuestionIndex: 0,
        },
      });

      const caller = await getTestCaller(user);

      // Act
      const result = await caller.session.getActiveSession({
        sessionId: createdSession.id,
      });

      // Assert
      expect(result).toMatchObject({
        sessionId: createdSession.id,
        isActive: true, // endTime is null
        personaId: MOCK_PERSONA_ID,
        currentQuestion: activeQuestionSegment.question,
        keyPoints: activeQuestionSegment.keyPoints,
        conversationHistory: activeQuestionSegment.conversation,
        questionNumber: 1,
        totalQuestions: 1,
        canProceedToNextTopic: false, // Less than 4 conversation turns
      });
    });
  });

  describe('saveSession procedure', () => {
    it('should save session state successfully', async () => {
      // Arrange: Create session
      const createdSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResume.id,
          personaId: MOCK_PERSONA_ID,
          durationInSeconds: 1800,
          questionSegments: [],
          currentQuestionIndex: 0,
        },
      });

      const caller = await getTestCaller(user);

      // Act
      const result = await caller.session.saveSession({
        sessionId: createdSession.id,
        currentResponse: 'Work in progress...'
      });

      // Assert
      expect(result).toMatchObject({
        saved: true,
        timestamp: expect.any(Date),
      });
    });
  });
}); 