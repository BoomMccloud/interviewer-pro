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
  // We'll add mocks for the specific report-generation LLM calls here
  getOverallAssessmentFromLLM: jest.fn(),
}));

jest.mock('~/lib/personaService', () => ({
    __esModule: true,
    getPersona: jest.fn(),
}));

import { getOverallAssessmentFromLLM } from '~/lib/gemini';
import { getPersona } from '~/lib/personaService';

const mockGetOverallAssessmentFromLLMFn = getOverallAssessmentFromLLM as jest.MockedFunction<typeof getOverallAssessmentFromLLM>;
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
        it('should return a high-level assessment for an authorized user', async () => {
            // Arrange
            const caller = await getTestCaller(user);
            const mockAssessment = {
                overallFit: [{ competency: 'Test Competency', assessment: 'Excellent', score: 9 }]
            };
            mockGetOverallAssessmentFromLLMFn.mockResolvedValue(mockAssessment);

            // Act
            const result = await caller.report.getOverallAssessment({ sessionId: session.id });

            // Assert
            expect(result).toEqual({
                ...mockAssessment,
                persona: MOCK_PERSONA_OBJECT,
                durationInSeconds: session.durationInSeconds,
            });

            // Verify that the mocked LLM function was called correctly
            expect(mockGetOverallAssessmentFromLLMFn).toHaveBeenCalledTimes(1);
            expect(mockGetOverallAssessmentFromLLMFn).toHaveBeenCalledWith(
                expect.objectContaining({ id: jdResume.id }),
                MOCK_PERSONA_OBJECT,
                session.questionSegments
            );
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
            // mockGetQuestionFeedbackFromLLM.mockResolvedValue(mockFeedback);

            // Act
            const result = await caller.report.getQuestionInitialFeedback({ sessionId: session.id, questionId });

            // Assert
            expect(result).toEqual(mockFeedback);
            // expect(mockGetQuestionFeedbackFromLLM).toHaveBeenCalledTimes(1);
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
});
