/**
 * tRPC router for session-related procedures.
 */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getFirstQuestion, continueInterview } from "~/lib/gemini";
import { getPersona } from "~/lib/personaService";
import type { MvpSessionTurn } from "~/types"; // Assuming MvpSessionTurn is in types
import { zodMvpSessionTurnArray } from "~/types"; // Added import for Zod schema

export const sessionRouter = createTRPCRouter({
  createSession: protectedProcedure
    .input(z.object({ 
      personaId: z.string(),
      durationInSeconds: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement logic:
      // 1. Ensure user has JdResumeText
      // 2. Call getPersona(input.personaId)
      // 3. Call getFirstQuestion(jdResumeText, persona)
      // 4. Create SessionData in DB, store initial AI question in history
      // 5. Return { sessionId: newSession.id, firstQuestion: aiResponse.questionText, rawAiResponseText: aiResponse.rawAiResponseText }

      // Placeholder implementation:
      console.log("User from context:", ctx.session.user);
      console.log("Persona ID from input:", input.personaId);
      
      // Example: Fetch JdResumeText for the user (actual logic needed)
      const jdResumeRecord = await db.jdResumeText.findFirst({
        where: { userId: ctx.session.user.id },
      });

      if (!jdResumeRecord) {
        throw new Error("JD/Resume not found for user.");
      }

      const persona = await getPersona(input.personaId);
      if (!persona) {
        throw new Error("Persona not found.");
      }

      const firstQuestionResponse = await getFirstQuestion(jdResumeRecord, persona);

      const newSession = await db.sessionData.create({
        data: {
          userId: ctx.session.user.id,
          jdResumeTextId: jdResumeRecord.id,
          personaId: input.personaId,
          durationInSeconds: input.durationInSeconds ?? 0,
          history: [
            {
              id: `turn-${Date.now()}-model`,
              role: "model",
              text: firstQuestionResponse.questionText,
              rawAiResponseText: firstQuestionResponse.rawAiResponseText,
              timestamp: new Date(),
            },
          ] as unknown as MvpSessionTurn[],
        },
      });

      return {
        sessionId: newSession.id,
        firstQuestion: firstQuestionResponse.questionText,
        rawAiResponseText: firstQuestionResponse.rawAiResponseText,
      };
    }),

  /**
   * Lists all sessions for the current user's JD/Resume text.
   * Returns an array of SessionData objects for the authenticated user.
   */
  listForCurrentText: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // First, find the user's current JD/Resume text
    const jdResumeRecord = await db.jdResumeText.findFirst({
      where: { userId },
    });

    if (!jdResumeRecord) {
      // If no JD/Resume text exists, return empty array
      return [];
    }

    // Find all sessions for this JD/Resume text
    const sessions = await db.sessionData.findMany({
      where: {
        userId,
        jdResumeTextId: jdResumeRecord.id,
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
    });

    return sessions;
  }),

  // Placeholder for getSessionById
  getSessionById: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // TODO: Implement logic
      // 1. Find session by ID, ensure it belongs to ctx.session.user.id
      // 2. Return session data (or null/error if not found/not authorized)
      return db.sessionData.findUnique({
        where: { id: input.sessionId, userId: ctx.session.user.id },
      });
    }),
  
  // Placeholder for submitAnswerToSession
  submitAnswerToSession: protectedProcedure
    .input(z.object({ 
      sessionId: z.string(), 
      userAnswer: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Implement logic
      // 1. Fetch session by ID, ensure it's active and belongs to user.
      // 2. Get persona from session.personaId or session.personaSnapshot.
      // 3. Get JdResumeText from session.jdResumeTextId.
      // 4. Append user's answer to history.
      // 5. Call continueInterview(jdResume, persona, history, userAnswer).
      // 6. Append AI's response to history.
      // 7. Update session in DB with new history.
      // 8. Return { nextQuestion, analysis, feedbackPoints, suggestedAlternative, rawAiResponseText }
      
      // Example placeholder:
      const currentSession = await db.sessionData.findUnique({
        where: { id: input.sessionId, userId: ctx.session.user.id },
      });
      if (!currentSession) throw new Error("Session not found or not authorized.");
      
      // Parse history safely using Zod
      let historyPlaceholder: MvpSessionTurn[] = [];
      if (currentSession.history) {
        try {
          historyPlaceholder = zodMvpSessionTurnArray.parse(currentSession.history);
        } catch (error) {
          // Handle parsing error, e.g., log it or throw a specific error
          console.error("Failed to parse session history:", error);
          throw new Error("Invalid session history format.");
        }
      }
      
      const userTurn: MvpSessionTurn = {
        id: `turn-${Date.now()}-user`,
        role: "user",
        text: input.userAnswer,
        timestamp: new Date(),
      };
      historyPlaceholder.push(userTurn);

      // Fetch persona using personaId from the session
      const persona = await getPersona(currentSession.personaId);
      if (!persona) throw new Error("Persona not found for session. ID: " + currentSession.personaId);

      const jdResumeRecord = await db.jdResumeText.findUnique({ where: { id: currentSession.jdResumeTextId }});
      if (!jdResumeRecord) throw new Error("JD/Resume record not found for session.");

      const aiResponse = await continueInterview(jdResumeRecord, persona, [...historyPlaceholder], input.userAnswer);
      
      const aiTurn: MvpSessionTurn = {
        id: `turn-${Date.now()}-model`,
        role: "model",
        text: aiResponse.nextQuestion,
        analysis: aiResponse.analysis,
        feedbackPoints: aiResponse.feedbackPoints,
        suggestedAlternative: aiResponse.suggestedAlternative,
        rawAiResponseText: aiResponse.rawAiResponseText,
        timestamp: new Date(),
      };
      historyPlaceholder.push(aiTurn);

      await db.sessionData.update({
        where: { id: input.sessionId },
        data: { history: historyPlaceholder }, // Removed 'as any' cast
      });

      return aiResponse;
    }),
    
  // Placeholder for getReportBySessionId (if needed for MVP)
  // getReportBySessionId: protectedProcedure
  //   .input(z.object({ sessionId: z.string() }))
  //   .query(async ({ ctx, input }) => {
  //     // TODO: Implement logic
  //     return null;
  //   }),
});

export type SessionRouter = typeof sessionRouter; 