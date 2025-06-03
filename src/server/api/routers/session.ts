/**
 * tRPC router for session-related procedures.
 */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { continueInterview, getFirstQuestion, continueConversation, getNewTopicalQuestion } from "~/lib/gemini";
import { getPersona } from "~/lib/personaService";
import type { MvpSessionTurn, SessionReportData, SessionAnalyticsData, SessionFeedbackData } from "~/types";
import { zodMvpSessionTurnArray, zodPersonaId, PERSONA_IDS } from "~/types";
import type { Prisma } from '@prisma/client'; // Changed to type import
import { TRPCError } from "@trpc/server";

// Helper function for consistent question generation
async function generateQuestionForSession(
  jdResumeTextId: string,
  personaId: string,
  questionType: 'opening' | 'technical' | 'behavioral' | 'followup' = 'opening',
  userId: string
) {
  // Fetch JD/Resume data with user authorization
  const jdResumeText = await db.jdResumeText.findUnique({
    where: { 
      id: jdResumeTextId,
      userId: userId, // Ensure user owns this data
    },
  });

  if (!jdResumeText) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'JD/Resume text not found or not authorized',
    });
  }

  // Get persona configuration
  const persona = await getPersona(personaId);
  if (!persona) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Persona not found: ${personaId}`,
    });
  }

  // Generate question using AI service
  const questionResult = await getFirstQuestion(jdResumeText, persona);
  
  // Parse the AI response to extract structured data
  const { parseAiResponse } = await import('~/lib/gemini');
  const parsedResponse = parseAiResponse(questionResult.rawAiResponseText);

  return {
    question: parsedResponse.nextQuestion ?? questionResult.questionText,
    keyPoints: parsedResponse.keyPoints ?? [
      "Focus on your specific role and contributions",
      "Highlight technologies and tools you used", 
      "Discuss challenges faced and how you overcame them"
    ],
    questionType,
    personaId,
    metadata: {
      difficulty: 'medium' as const,
      estimatedResponseTime: 180, // 3 minutes in seconds
      tags: ['general', 'experience'] as string[],
    },
    rawAiResponse: questionResult.rawAiResponseText,
  };
}

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
          history: [{
            id: `turn-${Date.now()}-model`,
            role: "model",
            text: firstQuestionResponse.questionText,
            rawAiResponseText: firstQuestionResponse.rawAiResponseText,
            timestamp: new Date().toISOString(),
          }] as Prisma.InputJsonValue,
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
      
      // Determine if this is a conversational follow-up or a new topic
      // For now, we'll use a simple heuristic: if the response contains analysis/feedback,
      // it's likely a conversational response. We can make this more sophisticated later.
      const hasAnalysisOrFeedback = aiResponse.analysis && aiResponse.analysis !== "N/A" && 
                                   aiResponse.analysis !== "No analysis provided for this answer.";
      const hasMeaningfulFeedback = aiResponse.feedbackPoints && 
                                   aiResponse.feedbackPoints.length > 0 && 
                                   !aiResponse.feedbackPoints.includes("No specific feedback provided.");

      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      const isConversationalResponse = hasAnalysisOrFeedback || hasMeaningfulFeedback;

      // Create appropriate AI turn based on response type
      let aiTurn: MvpSessionTurn;
      let isTopicTransition = false;

      if (isConversationalResponse) {
        // This is a conversational follow-up - show analysis/feedback in chat
        let conversationalText = "";
        
        if (hasAnalysisOrFeedback) {
          conversationalText += `${aiResponse.analysis}\n\n`;
        }
        
        if (hasMeaningfulFeedback) {
          conversationalText += `💡 Key feedback:\n${aiResponse.feedbackPoints?.map(point => `• ${point}`).join('\n')}\n\n`;
        }
        
        // Add the follow-up question to the conversation
        if (aiResponse.nextQuestion) {
          conversationalText += `${aiResponse.nextQuestion}`;
        }

        aiTurn = {
          id: `turn-${Date.now()}-model`,
          role: "model",
          text: conversationalText.trim(),
          analysis: aiResponse.analysis,
          feedbackPoints: aiResponse.feedbackPoints,
          suggestedAlternative: aiResponse.suggestedAlternative,
          rawAiResponseText: aiResponse.rawAiResponseText,
          timestamp: new Date(),
          type: 'conversational', // Mark as conversational response
        };
      } else {
        // This is a new topical question - will update current question section
        aiTurn = {
          id: `turn-${Date.now()}-model`,
          role: "model",
          text: aiResponse.nextQuestion ?? "Interview completed",
          analysis: aiResponse.analysis,
          feedbackPoints: aiResponse.feedbackPoints,
          suggestedAlternative: aiResponse.suggestedAlternative,
          rawAiResponseText: aiResponse.rawAiResponseText,
          timestamp: new Date(),
          type: 'topic_transition', // Mark as topic transition
        };
        isTopicTransition = true;
      }

      historyPlaceholder.push(aiTurn);

      // Convert to JSON-compatible format for Prisma
      const historyForDb = historyPlaceholder.map(turn => ({
        ...turn,
        timestamp: turn.timestamp.toISOString()
      })) as Prisma.InputJsonValue;

      await db.sessionData.update({
        where: { id: input.sessionId },
        data: { history: historyForDb },
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

  // ==========================================
  // Question Generation API - Modality Agnostic
  // ==========================================

  generateInterviewQuestion: protectedProcedure
    .input(z.object({
      jdResumeTextId: z.string(),
      personaId: zodPersonaId,
      questionType: z.enum(['opening', 'technical', 'behavioral', 'followup']).default('opening'),
      previousQuestions: z.array(z.string()).optional(), // To avoid duplicates
      context: z.string().optional(), // Additional context for follow-up questions
    }))
    .query(async ({ input, ctx }) => {
      // ✨ NEW: Use the shared question generation helper function
      // This ensures consistency between standalone and session-based question generation
      return await generateQuestionForSession(
        input.jdResumeTextId,
        input.personaId,
        input.questionType,
        ctx.session.user.id
      );
    }),

  // ==========================================
  // Phase 2A: Session Reports & Analytics Procedures
  // ==========================================

  getSessionReport: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }): Promise<SessionReportData> => {
      // Fetch session and validate ownership
      const session = await db.sessionData.findUnique({
        where: { 
          id: input.sessionId,
          userId: ctx.session.user.id, // Ensure user owns this session
        },
      });

      if (!session) {
        throw new Error("Session not found or not authorized");
      }

      if (session.userId !== ctx.session.user.id) {
        console.log(`AUTH DEBUG: session.userId=${session.userId}, ctx.session.user.id=${ctx.session.user.id}`);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authorized to access this session',
        });
      }

      // Parse session history
      let history: MvpSessionTurn[] = [];
      if (session.history) {
        try {
          history = zodMvpSessionTurnArray.parse(session.history);
        } catch (error) {
          console.error("Failed to parse session history:", error);
          throw new Error("Invalid session history format");
        }
      }

      // Calculate metrics
      const questionCount = history.filter(turn => turn.role === 'model').length;
      const answerCount = history.filter(turn => turn.role === 'user').length;
      const completionPercentage = questionCount > 0 ? (answerCount / questionCount) * 100 : 0;

      // Calculate average response time
      let averageResponseTime = 0;
      const responseTimes: number[] = [];
      
      for (let i = 0; i < history.length - 1; i++) {
        const currentTurn = history[i];
        const nextTurn = history[i + 1];
        
        if (currentTurn?.role === 'model' && nextTurn?.role === 'user') {
          const responseTime = (nextTurn.timestamp.getTime() - currentTurn.timestamp.getTime()) / 1000;
          responseTimes.push(responseTime);
        }
      }
      
      if (responseTimes.length > 0) {
        averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      }

      return {
        sessionId: session.id,
        durationInSeconds: session.durationInSeconds,
        history,
        questionCount,
        completionPercentage,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        averageResponseTime,
        personaId: session.personaId,
        jdResumeTextId: session.jdResumeTextId,
      };
    }),

  getSessionAnalytics: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }): Promise<SessionAnalyticsData> => {
      // Fetch session and validate ownership
      const session = await db.sessionData.findUnique({
        where: { 
          id: input.sessionId,
          userId: ctx.session.user.id,
        },
      });

      if (!session) {
        throw new Error("Session not found or not authorized");
      }

      if (session.userId !== ctx.session.user.id) {
        console.log(`AUTH DEBUG: session.userId=${session.userId}, ctx.session.user.id=${ctx.session.user.id}`);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authorized to access this session',
        });
      }

      // Parse session history
      let history: MvpSessionTurn[] = [];
      if (session.history) {
        try {
          history = zodMvpSessionTurnArray.parse(session.history);
        } catch (error) {
          console.error("Failed to parse session history:", error);
          throw new Error("Invalid session history format");
        }
      }

      // Calculate analytics
      const totalQuestions = history.filter(turn => turn.role === 'model').length;
      const totalAnswers = history.filter(turn => turn.role === 'user').length;
      const completionPercentage = totalQuestions > 0 ? (totalAnswers / totalQuestions) * 100 : 0;
      const sessionDurationMinutes = session.durationInSeconds / 60;

      // Calculate response times
      const responseTimeMetrics: number[] = [];
      
      for (let i = 0; i < history.length - 1; i++) {
        const currentTurn = history[i];
        const nextTurn = history[i + 1];
        
        if (currentTurn?.role === 'model' && nextTurn?.role === 'user') {
          const responseTime = (nextTurn.timestamp.getTime() - currentTurn.timestamp.getTime()) / 1000;
          responseTimeMetrics.push(responseTime);
        }
      }

      const averageResponseTime = responseTimeMetrics.length > 0 
        ? responseTimeMetrics.reduce((sum, time) => sum + time, 0) / responseTimeMetrics.length
        : 0;

      // Calculate performance score (simple algorithm for now)
      let performanceScore = 0;
      if (totalQuestions > 0) {
        const completionWeight = 0.4;
        const responseTimeWeight = 0.6;
        
        // Score based on completion percentage
        const completionScore = completionPercentage;
        
        // Score based on response time (faster is better, cap at reasonable time)
        let responseTimeScore = 0;
        if (averageResponseTime > 0) {
          const idealResponseTime = 60; // 60 seconds is ideal
          const maxResponseTime = 300; // 5 minutes is poor
          responseTimeScore = Math.max(0, Math.min(100, 
            100 - ((averageResponseTime - idealResponseTime) / (maxResponseTime - idealResponseTime)) * 100
          ));
        }
        
        performanceScore = (completionScore * completionWeight) + (responseTimeScore * responseTimeWeight);
      }

      return {
        sessionId: session.id,
        totalQuestions,
        totalAnswers,
        averageResponseTime,
        responseTimeMetrics,
        completionPercentage,
        sessionDurationMinutes,
        performanceScore: Math.round(performanceScore),
      };
    }),

  getSessionFeedback: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }): Promise<SessionFeedbackData> => {
      // Fetch session and validate ownership
      const session = await db.sessionData.findUnique({
        where: { 
          id: input.sessionId,
          userId: ctx.session.user.id,
        },
      });

      if (!session) {
        throw new Error("Session not found or not authorized");
      }

      if (session.userId !== ctx.session.user.id) {
        console.log(`AUTH DEBUG: session.userId=${session.userId}, ctx.session.user.id=${ctx.session.user.id}`);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authorized to access this session',
        });
      }

      // Parse session history
      let history: MvpSessionTurn[] = [];
      if (session.history) {
        try {
          history = zodMvpSessionTurnArray.parse(session.history);
        } catch (error) {
          console.error("Failed to parse session history:", error);
          throw new Error("Invalid session history format");
        }
      }

      const totalQuestions = history.filter(turn => turn.role === 'model').length;
      const totalAnswers = history.filter(turn => turn.role === 'user').length;
      const isIncompleteSession = totalAnswers < 2; // Minimal threshold

      // Extract feedback from AI turns
      const aiTurns = history.filter(turn => turn.role === 'model');
      const feedbackPoints: string[] = [];
      const analysisPoints: string[] = [];

      aiTurns.forEach(turn => {
        if (turn.feedbackPoints) {
          feedbackPoints.push(...turn.feedbackPoints);
        }
        if (turn.analysis) {
          analysisPoints.push(turn.analysis);
        }
      });

      // Generate feedback based on session content
      const strengths: string[] = [];
      const areasForImprovement: string[] = [];
      const recommendations: string[] = [];

      if (isIncompleteSession) {
        recommendations.push('Complete more questions for better assessment');
        areasForImprovement.push('Session completion');
      } else {
        // Extract strengths from feedback points
        feedbackPoints.forEach(point => {
          if (point.toLowerCase().includes('good') || point.toLowerCase().includes('clear') || 
              point.toLowerCase().includes('strong') || point.toLowerCase().includes('relevant')) {
            strengths.push(point);
          }
        });

        // Default strengths if none found
        if (strengths.length === 0 && feedbackPoints.length > 0) {
          strengths.push('Engagement with interview questions');
        }
      }

      // Calculate overall score
      let overallScore = 0;
      if (totalQuestions > 0) {
        const completionRate = totalAnswers / totalQuestions;
        const engagementScore = feedbackPoints.length * 10; // 10 points per feedback item
        overallScore = Math.min(100, Math.round((completionRate * 60) + Math.min(40, engagementScore)));
      }

      // Generate detailed analysis
      let detailedAnalysis = '';
      if (isIncompleteSession) {
        detailedAnalysis = `This interview session had limited interaction with ${totalAnswers} responses to ${totalQuestions} questions. `;
        detailedAnalysis += 'A more complete session would provide better insights into your interview performance.';
      } else {
        detailedAnalysis = `Analysis of your interview session with ${totalAnswers} responses across ${totalQuestions} questions. `;
        if (analysisPoints.length > 0) {
          detailedAnalysis += analysisPoints.join(' ');
        } else {
          detailedAnalysis += 'Your responses demonstrated engagement with the interview process.';
        }
      }

      // Create skill assessment
      const skillAssessment: Record<string, number> = {
        'Communication': isIncompleteSession ? 20 : Math.min(85, 40 + (feedbackPoints.length * 15)),
        'Technical Knowledge': isIncompleteSession ? 15 : Math.min(90, 30 + (analysisPoints.length * 20)),
        'Problem Solving': isIncompleteSession ? 25 : Math.min(80, 35 + (totalAnswers * 10)),
        'Interview Readiness': Math.min(95, overallScore),
      };

      return {
        sessionId: session.id,
        overallScore,
        strengths,
        areasForImprovement,
        recommendations,
        detailedAnalysis,
        skillAssessment,
      };
    }),

  // Phase 3A: Live Interview Session Procedures (TDD Implementation)
  
  startInterviewSession: protectedProcedure
    .input(z.object({ 
      sessionId: z.string(),
      personaId: zodPersonaId // Use shared validation schema
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify session exists and belongs to user
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
        include: { jdResumeText: true },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      if (session.userId !== ctx.session.user.id) {
        console.log(`AUTH DEBUG: session.userId=${session.userId}, ctx.session.user.id=${ctx.session.user.id}`);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authorized to access this session',
        });
      }

      // Business logic validation
      if (session.endTime !== null) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session is already completed',
        });
      }

      // Get persona configuration - now type-safe!
      const persona = await getPersona(input.personaId);
      if (!persona) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Persona not found: ${input.personaId}. Available personas: ${Object.values(PERSONA_IDS).join(', ')}`,
        });
      }

      // ✨ NEW: Use the shared question generation helper function with randomization
      // This ensures consistency between standalone and session-based question generation
      // and prevents duplicate questions across sessions
      const questionTypes = ['opening', 'technical', 'behavioral'] as const;
      const randomQuestionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
      
      const questionGenerationResult = await generateQuestionForSession(
        session.jdResumeTextId,
        input.personaId,
        randomQuestionType, // Now randomized instead of always 'opening'
        ctx.session.user.id
      );
      
      // Create the first AI turn and save to database
      const aiTurn: MvpSessionTurn = {
        id: `turn-${Date.now()}-model`,
        role: "model",
        text: questionGenerationResult.question,
        rawAiResponseText: questionGenerationResult.rawAiResponse,
        timestamp: new Date(),
      };

      // Update session with the first AI question in history
      const historyForDb = [aiTurn].map(turn => ({
        ...turn,
        timestamp: turn.timestamp.toISOString()
      })) as Prisma.InputJsonValue;

      await ctx.db.sessionData.update({
        where: { id: input.sessionId },
        data: { 
          history: historyForDb,
          startTime: new Date() // Also set the start time
        },
      });
      
      return {
        sessionId: input.sessionId,
        isActive: true, // endTime === null indicates active session
        personaId: input.personaId,
        currentQuestion: questionGenerationResult.question,
        keyPoints: questionGenerationResult.keyPoints,
        questionNumber: 1,
        totalQuestions: 10, // Default total questions for interview
        timeRemaining: session.durationInSeconds ?? 3600, // Use session configuration
        conversationHistory: [],
      };
    }),

  // 🔗 INTEGRATION PHASE: Separated procedures for clean conversation flow
  
  // ✅ submitResponse - purely conversational responses within same topic
  submitResponse: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      userResponse: z.string().min(1, "User response cannot be empty").trim(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify session exists and user has access
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
        include: { jdResumeText: true },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      if (session.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authorized to access this session',
        });
      }

      // Parse existing conversation history
      let history: MvpSessionTurn[] = [];
      if (session.history) {
        try {
          history = zodMvpSessionTurnArray.parse(session.history);
        } catch (error) {
          console.error("Failed to parse session history:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid session history format',
          });
        }
      }

      // Add user response to history
      const userTurn: MvpSessionTurn = {
        id: `turn-${Date.now()}-user`,
        role: "user",
        text: input.userResponse,
        timestamp: new Date(),
      };
      history.push(userTurn);

      // Get persona and call AI service for conversational response
      const persona = await getPersona(session.personaId);
      if (!persona) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Persona not found',
        });
      }

      // 🔗 Use separated continueConversation function - NO topic transitions
      const conversationalResponse = await continueConversation(
        session.jdResumeText,
        persona,
        history,
        input.userResponse
      );

      // Create conversational AI turn for chat history
      const aiTurn: MvpSessionTurn = {
        id: `turn-${Date.now()}-model`,
        role: "model",
        text: conversationalResponse.followUpQuestion,
        analysis: conversationalResponse.analysis,
        feedbackPoints: conversationalResponse.feedbackPoints,
        rawAiResponseText: conversationalResponse.rawAiResponseText,
        timestamp: new Date(),
        type: 'conversational', // Mark as conversational response
      };

      history.push(aiTurn);

      // Update session with new history
      const historyForDb = history.map(turn => ({
        ...turn,
        timestamp: turn.timestamp.toISOString()
      })) as Prisma.InputJsonValue;

      await ctx.db.sessionData.update({
        where: { id: input.sessionId },
        data: { history: historyForDb },
      });

      return {
        analysis: conversationalResponse.analysis,
        feedbackPoints: conversationalResponse.feedbackPoints,
        followUpQuestion: conversationalResponse.followUpQuestion,
        conversationHistory: [
          {
            role: 'user' as const,
            content: input.userResponse,
            timestamp: new Date().toISOString(),
          },
          {
            role: 'ai' as const,
            content: aiTurn.text,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }),

  // ✅ getNextTopicalQuestion - topic transitions only, user-controlled
  getNextTopicalQuestion: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify session exists and user has access
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
        include: { jdResumeText: true },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      if (session.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authorized to access this session',
        });
      }

      // Parse existing conversation history
      let history: MvpSessionTurn[] = [];
      if (session.history) {
        try {
          history = zodMvpSessionTurnArray.parse(session.history);
        } catch (error) {
          console.error("Failed to parse session history:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid session history format',
          });
        }
      }

      // Extract covered topics from history for intelligent topic selection
      const coveredTopics: string[] = [];
      for (const turn of history) {
        if (turn.role === 'model' && turn.type === 'topic_transition' && turn.rawAiResponseText) {
          // Try to extract topic from the AI response
          const questionMatch = /<QUESTION>(.*?)<\/QUESTION>/s.exec(turn.rawAiResponseText);
          if (questionMatch) {
            const question = questionMatch[1]?.toLowerCase() ?? '';
            // Simple topic detection - can be enhanced
            if (question.includes('react')) coveredTopics.push('React');
            if (question.includes('typescript')) coveredTopics.push('TypeScript');
            if (question.includes('node') || question.includes('backend')) coveredTopics.push('Node.js');
            if (question.includes('team') || question.includes('leadership')) coveredTopics.push('Leadership');
            if (question.includes('system') || question.includes('design')) coveredTopics.push('System Design');
          }
        }
      }

      // Get persona
      const persona = await getPersona(session.personaId);
      if (!persona) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Persona not found',
        });
      }

      // 🔗 Use separated getNewTopicalQuestion function - ONLY topic transitions
      const topicalResponse = await getNewTopicalQuestion(
        session.jdResumeText,
        persona,
        history,
        coveredTopics
      );

      // Create topic transition AI turn
      const aiTurn: MvpSessionTurn = {
        id: `turn-${Date.now()}-model`,
        role: "model",
        text: topicalResponse.questionText,
        rawAiResponseText: topicalResponse.rawAiResponseText,
        timestamp: new Date(),
        type: 'topic_transition', // Mark as topic transition
      };

      history.push(aiTurn);

      // Update session with new history
      const historyForDb = history.map(turn => ({
        ...turn,
        timestamp: turn.timestamp.toISOString()
      })) as Prisma.InputJsonValue;

      await ctx.db.sessionData.update({
        where: { id: input.sessionId },
        data: { history: historyForDb },
      });

      const questionNumber = history.filter(turn => turn.role === 'model' && (!turn.type || turn.type === 'topic_transition')).length;

      return {
        questionText: topicalResponse.questionText,
        keyPoints: topicalResponse.keyPoints,
        questionNumber,
        coveredTopics, // Return for frontend tracking
      };
    }),

  // 🟢 GREEN PHASE: getNextQuestion procedure
  getNextQuestion: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      userResponse: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify session exists and user has access
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
        include: { jdResumeText: true },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      if (session.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authorized to access this session',
        });
      }

      // Parse existing conversation history
      let history: MvpSessionTurn[] = [];
      if (session.history) {
        try {
          history = zodMvpSessionTurnArray.parse(session.history);
        } catch (error) {
          console.error("Failed to parse session history:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid session history format',
          });
        }
      }

      // Add user response to history
      const userTurn: MvpSessionTurn = {
        id: `turn-${Date.now()}-user`,
        role: "user",
        text: input.userResponse,
        timestamp: new Date(),
      };
      history.push(userTurn);

      // Get persona and call AI service for next question
      const persona = await getPersona(session.personaId);
      if (!persona) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Persona not found',
        });
      }

      // Call real AI service for next question
      const aiResponse = await continueInterview(
        session.jdResumeText,
        persona,
        history,
        input.userResponse
      );

      // Determine if this is a conversational follow-up or a new topic
      // For now, we'll use a simple heuristic: if the response contains analysis/feedback,
      // it's likely a conversational response. We can make this more sophisticated later.
      const hasAnalysisOrFeedback = aiResponse.analysis && aiResponse.analysis !== "N/A" && 
                                   aiResponse.analysis !== "No analysis provided for this answer.";
      const hasMeaningfulFeedback = aiResponse.feedbackPoints && 
                                   aiResponse.feedbackPoints.length > 0 && 
                                   !aiResponse.feedbackPoints.includes("No specific feedback provided.");

      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      const isConversationalResponse = hasAnalysisOrFeedback || hasMeaningfulFeedback;

      // Create appropriate AI turn based on response type
      let aiTurn: MvpSessionTurn;
      let isTopicTransition = false;

      if (isConversationalResponse) {
        // This is a conversational follow-up - show analysis/feedback in chat
        let conversationalText = "";
        
        if (hasAnalysisOrFeedback) {
          conversationalText += `${aiResponse.analysis}\n\n`;
        }
        
        if (hasMeaningfulFeedback) {
          conversationalText += `💡 Key feedback:\n${aiResponse.feedbackPoints?.map(point => `• ${point}`).join('\n')}\n\n`;
        }
        
        // Add the follow-up question to the conversation
        if (aiResponse.nextQuestion) {
          conversationalText += `${aiResponse.nextQuestion}`;
        }

        aiTurn = {
          id: `turn-${Date.now()}-model`,
          role: "model",
          text: conversationalText.trim(),
          analysis: aiResponse.analysis,
          feedbackPoints: aiResponse.feedbackPoints,
          suggestedAlternative: aiResponse.suggestedAlternative,
          rawAiResponseText: aiResponse.rawAiResponseText,
          timestamp: new Date(),
          type: 'conversational', // Mark as conversational response
        };
      } else {
        // This is a new topical question - will update current question section
        aiTurn = {
          id: `turn-${Date.now()}-model`,
          role: "model",
          text: aiResponse.nextQuestion ?? "Interview completed",
          analysis: aiResponse.analysis,
          feedbackPoints: aiResponse.feedbackPoints,
          suggestedAlternative: aiResponse.suggestedAlternative,
          rawAiResponseText: aiResponse.rawAiResponseText,
          timestamp: new Date(),
          type: 'topic_transition', // Mark as topic transition
        };
        isTopicTransition = true;
      }

      history.push(aiTurn);

      // Update session with new history
      const historyForDb = history.map(turn => ({
        ...turn,
        timestamp: turn.timestamp.toISOString()
      })) as Prisma.InputJsonValue;

      await ctx.db.sessionData.update({
        where: { id: input.sessionId },
        data: { history: historyForDb },
      });

      // Determine if interview is complete
      const isComplete = !aiResponse.nextQuestion;
      const questionNumber = history.filter(turn => turn.role === 'model').length;

      // If interview is complete, mark session as ended
      if (isComplete) {
        await ctx.db.sessionData.update({
          where: { id: input.sessionId },
          data: { endTime: new Date() },
        });
      }

      return {
        nextQuestion: isTopicTransition ? aiResponse.nextQuestion : null, // Only return if topic changed
        questionNumber,
        isComplete,
        isTopicTransition,
        conversationResponse: isConversationalResponse ? aiTurn.text : null, // Include conversational response
        analysis: aiResponse.analysis,
        feedbackPoints: aiResponse.feedbackPoints,
        conversationHistory: [
          {
            role: 'user' as const,
            content: input.userResponse,
            timestamp: new Date().toISOString(),
          },
          {
            role: 'ai' as const,
            content: aiTurn.text,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }),

  // 🟢 GREEN PHASE: updateSessionState procedure  
  updateSessionState: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      action: z.enum(['pause', 'resume', 'end']),
      currentResponse: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify session exists and user has access
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      if (session.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authorized to access this session',
        });
      }

      if (input.action === 'pause') {
        // Parse existing conversation history
        let history: MvpSessionTurn[] = [];
        if (session.history) {
          try {
            history = zodMvpSessionTurnArray.parse(session.history);
          } catch (error) {
            console.error("Failed to parse session history:", error);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Invalid session history format',
            });
          }
        }

        // Add pause entry to history
        const pauseEntry: MvpSessionTurn = {
          id: `pause-${Date.now()}`,
          role: "user", // Use user role but with special type
          text: input.currentResponse ?? '',
          type: 'pause',
          timestamp: new Date(),
        };
        history.push(pauseEntry);

        // Update session with pause state in history
        const historyForDb = history.map(turn => ({
          ...turn,
          timestamp: turn.timestamp.toISOString()
        })) as Prisma.InputJsonValue;

        await ctx.db.sessionData.update({
          where: { id: input.sessionId },
          data: { history: historyForDb },
        });

        return {
          isPaused: true,
          lastActivityTime: new Date().toISOString(),
        };
      } else if (input.action === 'resume') {
        return {
          isPaused: false,
          lastActivityTime: new Date().toISOString(),
        };
      } else if (input.action === 'end') {
        // Update database to mark session as ended
        await ctx.db.sessionData.update({
          where: { id: input.sessionId },
          data: { endTime: new Date() },
        });

        return {
          isCompleted: true,
          endTime: new Date().toISOString(),
        };
      }

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid action',
      });
    }),

  // 🟢 GREEN PHASE: resetSession procedure for restarting completed sessions
  resetSession: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify session exists and user has access
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      if (session.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authorized to access this session',
        });
      }

      // Reset session to fresh state - clear ALL historical data
      await ctx.db.sessionData.update({
        where: { id: input.sessionId },
        data: {
          startTime: new Date(),   // Reset start time (will be updated when interview actually starts)
          endTime: null,           // Mark as active again
          history: [],             // Clear conversation history
          overallSummary: null,    // Clear any summary
        },
      });

      return {
        sessionId: input.sessionId,
        isReset: true,
        message: 'Session reset successfully and ready to restart',
      };
    }),

  // 🟢 COMPLETED: getActiveSession procedure with real data
  getActiveSession: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      // Verify session exists and user has access
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      if (session.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authorized to access this session',
        });
      }

      // Parse existing conversation history
      let history: MvpSessionTurn[] = [];
      if (session.history) {
        try {
          history = zodMvpSessionTurnArray.parse(session.history);
        } catch (error) {
          console.error("Failed to parse session history:", error);
          // If history is corrupted, start fresh
          history = [];
        }
      }

      // Convert history to frontend format - Include conversational responses in chat history
      // but exclude topic transitions and pause entries (those are not part of the conversation)
      const conversationHistory = history
        .filter(turn => {
          // Include user responses (except pause entries) and AI conversational responses (but not topic transitions)
          return (turn.role === 'user' && turn.type !== 'pause') || 
                 (turn.role === 'model' && turn.type === 'conversational');
        })
        .map(turn => ({
          role: turn.role === 'user' ? 'user' as const : 'ai' as const,
          content: turn.text,
          timestamp: typeof turn.timestamp === 'string' ? turn.timestamp : turn.timestamp.toISOString(),
        }));

      // Find the most recent AI topic transition for currentQuestion
      const lastTopicTransition = history
        .filter(turn => turn.role === 'model' && (!turn.type || turn.type === 'topic_transition'))
        .pop();

      // Determine current question and extract key points
      let currentQuestion = 'Loading...';
      let keyPoints: string[] = [];
      let questionNumber = 1;

      if (lastTopicTransition) {
        currentQuestion = lastTopicTransition.text;
        questionNumber = history.filter(turn => turn.role === 'model' && (!turn.type || turn.type === 'topic_transition')).length;
        
        // Extract key points from the AI response if available
        if (lastTopicTransition.rawAiResponseText) {
          try {
            const { parseAiResponse } = await import('~/lib/gemini');
            const parsedResponse = parseAiResponse(lastTopicTransition.rawAiResponseText);
            keyPoints = parsedResponse.keyPoints ?? [];
          } catch (error) {
            console.error("Failed to parse AI response for key points:", error);
            // Use fallback key points
            keyPoints = [
              "Focus on your specific role and contributions",
              "Highlight technologies and tools you used", 
              "Discuss challenges faced and how you overcame them"
            ];
          }
        }
      } else {
        // No topic transitions yet - this is a brand new session that needs to be started
        currentQuestion = 'Interview not started yet. Please start the interview.';
        questionNumber = 0;
        keyPoints = [];
      }

      return {
        sessionId: input.sessionId,
        isActive: session.endTime === null, // endTime === null means active
        personaId: session.personaId,
        currentQuestion,
        keyPoints,
        conversationHistory,
        questionNumber,
        timeRemaining: session.durationInSeconds ?? 1800, // Use actual duration or default
      };
    }),
});

export type SessionRouter = typeof sessionRouter; 