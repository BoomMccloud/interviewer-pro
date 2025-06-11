import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getPersona } from "~/lib/personaService";
import { getOverallAssessmentFromLLM } from "~/lib/gemini";
import { zodQuestionSegmentArray } from "~/types";


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

            const [jdResumeText, persona] = await Promise.all([
                ctx.db.jdResumeText.findUnique({ where: { id: session.jdResumeTextId ?? '' } }),
                getPersona(session.personaId),
            ]);

            if (!jdResumeText || !persona) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not retrieve required session data.' });
            }

            const questionSegments = zodQuestionSegmentArray.parse(session.questionSegments);

            const assessment = await getOverallAssessmentFromLLM(jdResumeText, persona, questionSegments);

            return {
                ...assessment,
                persona: persona,
                durationInSeconds: session.durationInSeconds,
            };
        }),
}); 