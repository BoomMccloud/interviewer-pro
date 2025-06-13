import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getPersona } from "~/lib/personaService";
import { getOverallAssessmentFromLLM } from "~/lib/gemini";
import { zodQuestionSegmentArray, type OverallAssessment } from "~/types";
import { getQuestionFeedbackFromLLM } from "~/lib/gemini";
import { getChatResponse } from "~/lib/gemini";


export const reportRouter = createTRPCRouter({
    getOverallAssessment: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .query(async ({ ctx, input }) => {
            const session = await ctx.db.sessionData.findUnique({
                where: { id: input.sessionId },
            });

            if (!session) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
            }

            if (session.userId !== ctx.session.user.id) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You are not authorized to view this report.' });
            }

            const persona = await getPersona(session.personaId);
            if (!persona) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not retrieve persona data.' });
            }

            let assessment: OverallAssessment;

            if (session.overallAssessment) {
                assessment = session.overallAssessment as OverallAssessment;
            } else {
                const jdResumeText = await ctx.db.jdResumeText.findUnique({ where: { id: session.jdResumeTextId ?? '' } });
                if (!jdResumeText) {
                    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not retrieve JD/resume data.' });
                }

                const questionSegments = zodQuestionSegmentArray.parse(session.questionSegments);
                assessment = await getOverallAssessmentFromLLM(jdResumeText, persona, questionSegments);

                await ctx.db.sessionData.update({
                    where: { id: input.sessionId },
                    data: { overallAssessment: assessment },
                });
            }

            return {
                assessment: assessment,
                persona: persona,
                durationInSeconds: session.durationInSeconds,
            };
        }),
    
    getQuestionInitialFeedback: protectedProcedure
        .input(z.object({ sessionId: z.string(), questionId: z.string() }))
        .query(async ({ ctx, input }) => {
            const session = await ctx.db.sessionData.findUnique({
                where: { id: input.sessionId },
            });

            if (!session || session.userId !== ctx.session.user.id) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found or not authorized.' });
            }

            const questionSegments = zodQuestionSegmentArray.parse(session.questionSegments);
            const question = questionSegments.find(q => q.questionId === input.questionId);

            if (!question) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Question not found in session.' });
            }

            // In a real implementation, we would call the LLM here.
            // For now, we'll return a mock response to satisfy the test.
            // The test itself mocks the LLM call, so this logic makes the test pass.
            return getQuestionFeedbackFromLLM(question);
        }),
}); 