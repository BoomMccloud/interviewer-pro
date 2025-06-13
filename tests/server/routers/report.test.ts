/**
 * Test suite for the Report tRPC Router.
 *
 * This suite will integration-test the procedures related to generating
 * session reports, including the overall assessment and the interactive
 * feedback conversations.
 *
 * Mocks will be used for external services like `lib/gemini.ts`.
 * A test database will be used for Prisma client operations.
 */

import { createCaller } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { db } from '~/server/db';
import type { SessionData, JdResumeText, User } from '@prisma/client';
import type { Persona, QuestionSegment } from '~/types';
import { Prisma } from '@prisma/client';

// --- Mock External Dependencies ---
import { auth as actualAuth } from '~/server/auth';
jest.mock('~/server/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));
const mockedAuth = actualAuth as jest.MockedFunction<typeof actualAuth>;

jest.mock('~/lib/gemini', () => ({
  __esModule: true,
  getOverallAssessmentFromLLM: jest.fn(),
  getQuestionFeedbackFromLLM: jest.fn(),
  getChatResponse: jest.fn(),
}));

jest.mock('~/lib/personaService', () => ({
    __esModule: true,
    getPersona: jest.fn(),
}));

import { getOverallAssessmentFromLLM, getQuestionFeedbackFromLLM, getChatResponse } from '~/lib/gemini';
import { getPersona } from '~/lib/personaService';

const mockGetOverallAssessmentFromLLMFn = getOverallAssessmentFromLLM as jest.MockedFunction<typeof getOverallAssessmentFromLLM>;
const mockGetQuestionFeedbackFromLLMFn = getQuestionFeedbackFromLLM as jest.MockedFunction<typeof getQuestionFeedbackFromLLM>;
const mockGetChatResponseFn = getChatResponse as jest.MockedFunction<typeof getChatResponse>;
const mockGetPersonaFn = getPersona as jest.MockedFunction<typeof getPersona>;


const MOCK_PERSONA_ID = 'swe-interviewer-standard';
const MOCK_PERSONA_OBJECT: Persona = {
  id: MOCK_PERSONA_ID,
  name: 'Test Persona',
  systemPrompt: 'You are a test persona.',
};


describe('Report tRPC Router', () => {
    let user: User;
    let jdResume: JdResumeText;
    let session: SessionData;

    const getTestCaller = async (sessionUser: User | null = user) => {
        const mockSession = sessionUser ? { user: { id: sessionUser.id }, expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() } : null;
        (mockedAuth as jest.Mock).mockResolvedValue(mockSession);
        const ctx = await createTRPCContext({ headers: new Headers() });
        return createCaller(ctx);
    };

    beforeAll(async () => {
        // One-time setup
        user = await db.user.create({
            data: { email: `report-user-${Date.now()}@test.com`, name: 'Report User' },
        });
        jdResume = await db.jdResumeText.create({
            data: { userId: user.id, jdText: 'Test JD for Report', resumeText: 'Test Resume for Report' },
        });
    });

    afterAll(async () => {
        await db.sessionData.deleteMany({});
        await db.jdResumeText.deleteMany({});
        await db.user.deleteMany({});
        await db.$disconnect();
    });

    beforeEach(async () => {
        mockGetOverallAssessmentFromLLMFn.mockReset();
        mockGetQuestionFeedbackFromLLMFn.mockReset();
        mockGetChatResponseFn.mockReset();
        mockGetPersonaFn.mockReset();
        (mockedAuth as jest.Mock).mockReset();

        // Default mocks
        mockGetPersonaFn.mockResolvedValue(MOCK_PERSONA_OBJECT);
        
        const initialQuestionSegments: QuestionSegment[] = [
            {
              questionId: 'q1_opening',
              questionNumber: 1,
              questionType: 'opening',
              question: 'Initial question',
              keyPoints: ['Focus on experience'],
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString(),
              conversation: [
                { role: 'ai', content: 'Initial question', timestamp: new Date().toISOString(), messageType: 'question' },
                { role: 'user', content: 'Here is my answer.', timestamp: new Date().toISOString(), messageType: 'response' }
              ]
            }
        ];

        session = await db.sessionData.create({
            data: {
              userId: user.id,
              jdResumeTextId: jdResume.id,
              personaId: MOCK_PERSONA_ID,
              durationInSeconds: 600,
              questionSegments: initialQuestionSegments as unknown as Prisma.InputJsonValue,
              currentQuestionIndex: 0,
              endTime: new Date(),
            },
        });
    });

    afterEach(async () => {
        await db.sessionData.deleteMany({ where: { userId: user.id } });
    });

    describe('getOverallAssessment procedure', () => {
        const mockAssessment = {
            summary: "The candidate is a good fit.",
            strengths: ["Strong problem-solving skills."],
            improvements: ["Could be more concise."],
            score: 8,
        };

        it('should return the saved assessment if it already exists in the database', async () => {
            // Arrange
            await db.sessionData.update({
                where: { id: session.id },
                // @ts-expect-error - overallAssessment is a new field, TS types might be stale during TDD.
                data: { overallAssessment: mockAssessment as unknown as Prisma.InputJsonValue },
            });
            const caller = await getTestCaller(user);
            mockGetOverallAssessmentFromLLMFn.mockResolvedValue({ summary: 'This should not be called', strengths: [], improvements: [], score: 0 });

            // Act
            const result = await caller.report.getOverallAssessment({ sessionId: session.id });

            // Assert
            // @ts-expect-error - The procedure's return type will be updated to include an 'assessment' property.
            expect(result.assessment).toEqual(mockAssessment);
            expect(mockGetOverallAssessmentFromLLMFn).not.toHaveBeenCalled();
        });

        it('should generate, save, and return assessment if not present', async () => {
            // Arrange
            const caller = await getTestCaller(user);
            mockGetOverallAssessmentFromLLMFn.mockResolvedValue(mockAssessment);

            // Act
            const result = await caller.report.getOverallAssessment({ sessionId: session.id });

            // Assert
            // @ts-expect-error - The procedure's return type will be updated to include an 'assessment' property.
            expect(result.assessment).toEqual(mockAssessment);
            expect(result.persona).toEqual(MOCK_PERSONA_OBJECT);
            expect(result.durationInSeconds).toBe(session.durationInSeconds);

            expect(mockGetOverallAssessmentFromLLMFn).toHaveBeenCalledTimes(1);
            expect(mockGetOverallAssessmentFromLLMFn).toHaveBeenCalledWith(
                expect.objectContaining({ id: jdResume.id }),
                MOCK_PERSONA_OBJECT,
                session.questionSegments
            );

            // Verify it was saved to the database
            const updatedSession = await db.sessionData.findUnique({ where: { id: session.id } });
            // @ts-expect-error - overallAssessment is a new field, TS types might be stale during TDD.
            expect(updatedSession?.overallAssessment).toEqual(mockAssessment);
        });

        it('should throw a NOT_FOUND error for a session that does not exist', async () => {
            // Arrange
            const caller = await getTestCaller(user);

            // Act & Assert
            await expect(
                caller.report.getOverallAssessment({ sessionId: 'non-existent-id' })
            ).rejects.toThrowError(/Session not found/);
        });

        it('should throw an UNAUTHORIZED error for a session owned by another user', async () => {
            // Arrange
            const otherUser = await db.user.create({ data: { email: `other-user-${Date.now()}@test.com` }});
            const caller = await getTestCaller(otherUser); // Caller is now otherUser

            // Act & Assert
            await expect(
                caller.report.getOverallAssessment({ sessionId: session.id }) // session is owned by the original `user`
            ).rejects.toThrowError(/You are not authorized to view this report/);
        });
    });

    describe('getQuestionInitialFeedback procedure', () => {
        it('should return initial feedback for a specific question', async () => {
            // Arrange
            const caller = await getTestCaller(user);
            const questionId = 'q1_opening'; // from our test session data
            const mockFeedback = {
                contentFeedback: 'Content was relevant.',
                clarityFeedback: 'Clarity was good.',
                confidenceFeedback: 'Appeared confident.',
            };
            // Assume a new LLM function for this, and mock it
            mockGetQuestionFeedbackFromLLMFn.mockResolvedValue(mockFeedback);

            // Act
            const result = await caller.report.getQuestionInitialFeedback({ sessionId: session.id, questionId });

            // Assert
            expect(result).toEqual(mockFeedback);
            expect(mockGetQuestionFeedbackFromLLMFn).toHaveBeenCalledTimes(1);
        });

        it('should throw NOT_FOUND if the questionId does not exist in the session', async () => {
            // Arrange
            const caller = await getTestCaller(user);

            // Act & Assert
            await expect(
                caller.report.getQuestionInitialFeedback({ sessionId: session.id, questionId: 'non-existent-q' })
            ).rejects.toThrowError(/Question not found in session/);
        });
    });

    describe('startOrGetFeedbackConversation procedure', () => {
        const input = { sessionId: '', questionId: 'q1_opening' };

        beforeEach(() => {
            input.sessionId = session.id;
        });

        it('should create and return a new feedback conversation if one does not exist', async () => {
            // Arrange
            const caller = await getTestCaller(user);

            // Act
            const result = await caller.report.startOrGetFeedbackConversation(input);

            // Assert
            expect(result.history).toHaveLength(0);
            expect(result.questionId).toBe(input.questionId);

            // Verify it was created in the DB
            const dbConversation = await db.feedbackConversation.findUnique({ where: { id: result.id } });
            expect(dbConversation).not.toBeNull();
        });

        it('should retrieve and return an existing feedback conversation', async () => {
            // Arrange
            const caller = await getTestCaller(user);
            const existingConversation = await db.feedbackConversation.create({
                data: {
                    userId: user.id,
                    sessionDataId: session.id,
                    questionId: input.questionId,
                    history: [{ role: 'user', content: 'hello' }],
                }
            });

            // Act
            const result = await caller.report.startOrGetFeedbackConversation(input);

            // Assert
            expect(result.id).toBe(existingConversation.id);
            expect(result.history).toHaveLength(1);
        });
    });

    describe('postToFeedbackConversation procedure', () => {
        let conversationId: string;

        beforeEach(async () => {
            const conversation = await db.feedbackConversation.create({
                data: {
                    userId: user.id,
                    sessionDataId: session.id,
                    questionId: 'q1_opening',
                    history: [],
                }
            });
            conversationId = conversation.id;
        });

        it('should add a user message, get a response, and return the updated conversation', async () => {
            // Arrange
            const caller = await getTestCaller(user);
            const userMessage = 'How can I improve my answer?';
            const aiResponse = 'You could try focusing on the STAR method.';
            // Assume a new LLM function for this chat interaction
            mockGetChatResponseFn.mockResolvedValue(aiResponse);

            // Act
            const result = await caller.report.postToFeedbackConversation({ conversationId, message: userMessage });

            // Assert
            expect(result.history).toHaveLength(2);
            expect(result.history[0]).toEqual({ role: 'user', content: userMessage });
            expect(result.history[1]).toEqual({ role: 'ai', content: aiResponse });
        });
    });
});
