/**
 * tRPC router for session-related procedures.
 */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getFirstQuestion, continueConversation, getNewTopicalQuestion, generateEphemeralToken, generateAllInterviewQuestions } from "~/lib/gemini";
import { getPersona } from "~/lib/personaService";
import { GoogleGenAI } from '@google/genai';
import type { 
  MvpSessionTurn, 
  // SessionReportData,     // REMOVED: Deprecated with legacy procedures
  // SessionAnalyticsData,  // REMOVED: Deprecated with legacy procedures  
  // SessionFeedbackData,   // REMOVED: Deprecated with legacy procedures
  QuestionSegment,
  ConversationTurn
} from "~/types";
import { 
  zodPersonaId, 
  PERSONA_IDS,
  zodQuestionSegmentArray,
} from "~/types";
import type { Prisma } from '@prisma/client'; // Changed to type import
import { TRPCError } from "@trpc/server";
import { transcribe as sttTranscribe } from "~/lib/speechService";
import { env } from "~/env";

/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/**
 * Helper function for consistent question generation
 */
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
  const questionResult = await getFirstQuestion(jdResumeText, persona, []);
  
  // Modern approach: use AI response directly + fallback key points
  // The legacy parseAiResponse is deprecated for natural question generation
  return {
    question: questionResult.questionText,
    keyPoints: [
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
      // 4. Create SessionData in DB, store initial AI question in questionSegments
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

      // Pass empty array for initial questionSegments
      const firstQuestionResponse = await getFirstQuestion(jdResumeRecord, persona, []);

      // Create first question segment immediately during session creation
      const firstQuestionSegment: QuestionSegment = {
        questionId: "q1_opening",
        questionNumber: 1,
        questionType: "opening",
        question: firstQuestionResponse.questionText,
        keyPoints: firstQuestionResponse.keyPoints, // Will be extracted from AI response
        startTime: new Date().toISOString(),
        endTime: null, // Active question
        conversation: [
          {
            role: "ai",
            content: firstQuestionResponse.questionText,
            timestamp: new Date().toISOString(),
            messageType: "question"
          }
        ]
      };

      // Use fallback key points (modern approach - AI generates natural questions)
      // The legacy parseAiResponse is deprecated, we use contextual fallbacks instead
      if (!firstQuestionSegment.keyPoints || firstQuestionSegment.keyPoints.length === 0) {
        firstQuestionSegment.keyPoints = [
          "Focus on your specific role and contributions",
          "Highlight technologies and tools you used", 
          "Discuss challenges faced and how you overcame them"
        ];
      }

      // Create session with populated questionSegments
      const newSession = await db.sessionData.create({
        data: {
          userId: ctx.session.user.id,
          jdResumeTextId: jdResumeRecord.id,
          personaId: input.personaId,
          durationInSeconds: input.durationInSeconds ?? 0,
          questionSegments: JSON.parse(JSON.stringify([firstQuestionSegment])) as Prisma.InputJsonValue,
          currentQuestionIndex: 0,
          startTime: new Date()
        },
      });

      return {
        sessionId: newSession.id,
        firstQuestion: firstQuestionResponse.questionText,
        rawAiResponseText: firstQuestionResponse.rawAiResponseText,
      };
    }),

  /**
   * Creates a draft session record without generating questions.
   * This is the first step before calling startInterviewSession.
   */
  createDraftSession: protectedProcedure
    .input(z.object({
      personaId: zodPersonaId,
    }))
    .mutation(async ({ ctx, input }) => {
      const { personaId } = input;
      const { user } = ctx.session;

      const jdResumeRecord = await db.jdResumeText.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
      });

      if (!jdResumeRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'JD/Resume not found for user. Please save your JD and Resume first.',
        });
      }

      const newSession = await db.sessionData.create({
        data: {
          userId: user.id,
          jdResumeTextId: jdResumeRecord.id,
          personaId: personaId,
          status: 'draft',
          durationInSeconds: 1900, // Default to 33 mins, can be changed later
          currentQuestionIndex: 0,
          questionSegments: [], // Initially empty
        },
      });

      return {
        sessionId: newSession.id,
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
  
  // LEGACY PROCEDURE - DEPRECATED in favor of submitResponse (QuestionSegments)
  // This procedure uses the old history field and conflicts with the new architecture
  // TODO: Remove this procedure once all frontend code is migrated to use submitResponse
  /*
  submitAnswerToSession: protectedProcedure
    .input(z.object({ 
      sessionId: z.string(), 
      userAnswer: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Legacy implementation using history field - DEPRECATED
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This procedure is deprecated. Use submitResponse instead.',
      });
    }),
  */

  // ==========================================
  // Question Generation API - Modality Agnostic
  // ==========================================

  // ------------------------------------------
  // Voice: End Question (save feedback)
  // ------------------------------------------
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
  endQuestion: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      questionText: z.string(),
      transcript: z.string().min(2, 'Transcript too short'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, questionText, transcript } = input;

      // Fetch session and verify ownership
      const session = await db.sessionData.findUnique({
        where: { id: sessionId, userId: ctx.session.user.id },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      const segments: Record<string, unknown>[] = Array.isArray(session.questionSegments)
        ? (session.questionSegments as unknown as Record<string, unknown>[])
        : JSON.parse(session.questionSegments as unknown as string);

      const idx = segments.findIndex((s) => s.question === questionText);
      const targetSeg = idx >= 0 ? segments[idx] : null;

      // Simple placeholder – in production call LLM helper
      const assessment = 'Pending';
      const coaching = 'Feedback will be generated soon.';

      const feedbackObj = {
        assessment,
        coaching,
        transcript,
        endTime: new Date().toISOString(),
      };

      if (targetSeg) {
        targetSeg.feedback = feedbackObj;
      } else {
        segments.push({
          question: questionText,
          feedback: feedbackObj,
        });
      }

      await db.sessionData.update({
        where: { id: sessionId },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
        data: { questionSegments: segments as unknown as Prisma.InputJsonValue },
      });

      return { assessment, coaching };
    }),

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

  // LEGACY PROCEDURES - DEPRECATED due to history field dependency
  // These procedures use the old history field and need to be rewritten for QuestionSegments
  // TODO: Rewrite these procedures to work with questionSegments field instead of history
  
  // NEW: Implemented report procedures using QuestionSegments structure
  getSessionReport: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Fetch session with validation
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
        include: { jdResumeText: true }
      });

      if (!session || session.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      // Parse question segments
      const questionSegments = zodQuestionSegmentArray.parse(session.questionSegments ?? []);
      
      // Convert question segments to legacy history format for compatibility
      const history: MvpSessionTurn[] = [];
      let turnCounter = 0;
      for (const segment of questionSegments) {
        for (const turn of segment.conversation) {
          turnCounter++;
          history.push({
            id: `${session.id}-turn-${turnCounter}`, // Ensure unique ID
            role: turn.role === 'ai' ? 'model' as const : 'user' as const,
            text: turn.content,
            timestamp: new Date(turn.timestamp),
          });
        }
      }

      return {
        sessionId: session.id,
        durationInSeconds: session.durationInSeconds,
        history: history,
        questionCount: questionSegments.length,
        completionPercentage: questionSegments.length > 0 
          ? (questionSegments.filter(q => q.endTime !== null).length / questionSegments.length) * 100 
          : 0,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        averageResponseTime: 45, // Mock for now - could calculate from conversation timestamps
        personaId: session.personaId,
        jdResumeTextId: session.jdResumeTextId,
      };
    }),

  getSessionAnalytics: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Fetch session with validation
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
      });

      if (!session || session.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      // Parse question segments for analytics
      const questionSegments = zodQuestionSegmentArray.parse(session.questionSegments ?? []);
      
      // Calculate basic analytics
      const totalQuestions = questionSegments.length;
      const completedQuestions = questionSegments.filter(q => q.endTime !== null).length;
      const totalResponses = questionSegments.reduce((acc, q) => 
        acc + q.conversation.filter(turn => turn.role === 'user').length, 0);
      
      // Calculate average response time (mock for now) - using inline value
      
      return {
        sessionId: session.id,
        totalQuestions,
        completedQuestions,
        totalAnswers: totalResponses, // Fix field name to match interface
        averageResponseTime: totalResponses > 0 ? 45 : 0, // Match interface field name
        responseTimeMetrics: totalResponses > 0 ? Array(totalResponses).fill(0).map(() => Math.floor(Math.random() * 120) + 15) : [], // Mock individual response times
        completionPercentage: totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0, // Fix field name
        sessionDurationMinutes: Math.floor(session.durationInSeconds / 60), // Convert to minutes
        performanceScore: Math.min(100, (totalResponses / Math.max(1, totalQuestions)) * 100), // Calculate performance score
      };
    }),

  getSessionFeedback: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Fetch session with validation  
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
      });

      if (!session || session.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      // For now, return mock feedback - in the future this could be AI-generated
      return {
        sessionId: session.id,
        overallScore: 75,
        strengths: [
          "Clear communication style",
          "Good technical knowledge",
          "Professional demeanor"
        ],
        areasForImprovement: [
          "Provide more specific examples",
          "Structure responses with STAR method",
          "Ask clarifying questions when needed"
        ],
        recommendations: [
          "Practice behavioral questions with concrete examples",
          "Research the company and role more thoroughly",
          "Work on confident body language and voice tone"
        ],
        detailedAnalysis: "Your interview responses show good technical understanding and professional communication. Focus on providing more specific examples and structuring your answers for maximum impact.",
        skillAssessment: {
          "Communication": 80,
          "Technical Knowledge": 75,
          "Problem Solving": 70,
          "Leadership": 65,
          "Adaptability": 78,
          "Teamwork": 82
        }
      };
    }),

  // Phase 3A: Live Interview Session Procedures (TDD Implementation)
  
  startInterviewSession: protectedProcedure
    .input(z.object({ 
      sessionId: z.string(),
      personaId: zodPersonaId,
    }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, personaId } = input;
      const { user } = ctx.session;
      
      console.log('🚀 [SESSION] startInterviewSession called');
      console.log('📝 [SESSION] Session ID:', sessionId);
      console.log('📝 [SESSION] Persona ID:', personaId);
      console.log('📝 [SESSION] User ID:', user.id);

      const session = await db.sessionData.findUnique({
        where: { id: sessionId, userId: user.id },
        include: { jdResumeText: true },
      });

      console.log('📝 [SESSION] Session found:', !!session);
      console.log('📝 [SESSION] Session belongs to user:', !!session);
      console.log('📝 [SESSION] JD/Resume attached:', !!session?.jdResumeText);

      if (!session || !session.jdResumeText) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session or required JD/Resume data not found.',
        });
      }

      console.log('🔍 [SESSION] Getting persona...');
      const persona = await getPersona(personaId);
      if (!persona) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Persona not found.' });
      }
      console.log('✅ [SESSION] Persona found:', persona.name);

      console.log('🔍 [SESSION] Calling generateAllInterviewQuestions...');
      const allQuestions = await generateAllInterviewQuestions(session.jdResumeText, persona, 3);
      console.log('✅ [SESSION] Batch questions generated:', allQuestions.length);

      if (allQuestions.length === 0) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate interview questions.' });
      }

      // And store them in the database
      await db.sessionData.update({
        where: { id: input.sessionId },
        data: {
          questionSegments: allQuestions.map((q, i) => ({
            questionId: `q${i + 1}_technical`,
            questionNumber: i + 1,
            questionType: 'technical',
            question: q.questionText,
            keyPoints: q.keyPoints,
            startTime: i === 0 ? new Date().toISOString() : null, // Start time for first question
            endTime: null,
            conversation: [
              {
                role: 'ai' as const,
                content: q.questionText,
                timestamp: new Date().toISOString(),
                messageType: 'question' as const,
              },
            ],
          })),
          currentQuestionIndex: 0,
          startTime: new Date(),
          status: 'active',
        },
      });

      const firstQuestion = allQuestions[0];
      if (!firstQuestion) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve the first question after generation.',
        });
      }

      return {
        sessionId: session.id,
        status: 'active',
        personaId: persona.id,
        questionNumber: 1,
        totalQuestions: allQuestions.length,
        currentQuestion: firstQuestion.questionText,
        keyPoints: firstQuestion.keyPoints,
        rawAiResponseText: firstQuestion.rawAiResponseText,
      };
    }),

  // 🔗 INTEGRATION PHASE: Separated procedures for clean conversation flow
  
  // LEGACY PROCEDURE - DEPRECATED due to history field dependency
  // This conflicts with the new QuestionSegments architecture submitResponse
  // TODO: Remove once all frontend code migrated to use submitResponse (QuestionSegments)
  /*
  submitResponse: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      userResponse: z.string().min(1, "User response cannot be empty").trim(),
    }))
    .mutation(async ({ input, ctx }) => {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This procedure is deprecated. Use the QuestionSegments submitResponse instead.',
      });
    }),
  */

  // ✅ getNextTopicalQuestion - topic transitions only, user-controlled
  // LEGACY VERSION - DEPRECATED due to history field dependency  
  getNextTopicalQuestionLegacy: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .mutation(async ({ input: _input, ctx: _ctx }) => {
      // This legacy procedure uses the history field and is deprecated
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This legacy procedure is deprecated. Use the QuestionSegments getNextTopicalQuestion instead.',
      });
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

      // Parse question segments
      let questionSegments: QuestionSegment[] = [];
      if (session.questionSegments) {
        try {
          questionSegments = zodQuestionSegmentArray.parse(session.questionSegments);
        } catch (error) {
          console.error("Failed to parse question segments:", error);
          // If questionSegments is corrupted, start fresh
          questionSegments = [];
        }
      }

      const currentQuestionIndex = session.currentQuestionIndex;
      const currentQuestion = questionSegments[currentQuestionIndex];

      if (!currentQuestion) {
        return {
          sessionId: input.sessionId,
          status: session.endTime === null ? 'active' : 'ended',
          personaId: session.personaId,
          startTime: session.startTime,
          currentQuestion: 'Interview not started yet. Please start the interview.',
          keyPoints: [],
          conversationHistory: [],
          questionNumber: 0,
          totalQuestions: questionSegments.length,
          canProceedToNextTopic: false,
        };
      }

      return {
        sessionId: input.sessionId,
        status: session.endTime === null ? 'active' : 'ended',
        personaId: session.personaId,
        startTime: session.startTime,
        currentQuestion: currentQuestion.question,
        keyPoints: currentQuestion.keyPoints,
        conversationHistory: currentQuestion.conversation,
        questionNumber: currentQuestion.questionNumber,
        totalQuestions: questionSegments.length,
        canProceedToNextTopic: currentQuestion.conversation.length >= 4, // Less than 4 conversation turns
      };
    }),

  // =============================================================================
  // 🟢 NEW QUESTION SEGMENTS PROCEDURES - TDD GREEN PHASE IMPLEMENTATION
  // =============================================================================

  // NEW: submitResponse procedure for QuestionSegments structure
  submitResponse: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      userResponse: z.string().min(1).trim(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('🚀 [SESSION] submitResponse called');
      console.log('📝 [SESSION] Session ID:', input.sessionId);
      console.log('📝 [SESSION] User response length:', input.userResponse.length);
      console.log('📝 [SESSION] User ID:', ctx.session.user.id);

      // Fetch session with validation
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
        include: { jdResumeText: true }
      });

      console.log('📝 [SESSION] Session found:', !!session);
      console.log('📝 [SESSION] JD/Resume attached:', !!session?.jdResumeText);

      if (!session || !session.jdResumeText) {
        console.error('❌ [SESSION] Session or JD/Resume data not found');
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session or required JD/Resume data not found' });
      }
      if (session.userId !== ctx.session.user.id) {
        console.error('❌ [SESSION] Unauthorized access attempt');
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authorized to access this session' });
      }

      // Parse question segments
      const questionSegments = zodQuestionSegmentArray.parse(session.questionSegments);
      const currentQuestionIndex = session.currentQuestionIndex;
      const currentQuestion = questionSegments[currentQuestionIndex];

      console.log('📝 [SESSION] Question segments count:', questionSegments.length);
      console.log('📝 [SESSION] Current question index:', currentQuestionIndex);
      console.log('📝 [SESSION] Current question found:', !!currentQuestion);

      if (!currentQuestion) {
        console.error('❌ [SESSION] No active question found');
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No active question' });
      }

      // Add user response to current question's conversation
      const userTurn: ConversationTurn = {
        role: "user",
        content: input.userResponse,
        timestamp: new Date().toISOString(),
        messageType: "response"
      };

      currentQuestion.conversation.push(userTurn);
      console.log('📝 [SESSION] Added user turn to conversation');

      // Get AI response (conversational follow-up, not new topic)
      console.log('🔍 [SESSION] Getting persona...');
      const persona = await getPersona(session.personaId);
      if (!persona) {
        console.error('❌ [SESSION] Persona not found:', session.personaId);
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Persona not found' });
      }
      console.log('✅ [SESSION] Persona found:', persona.name);

      // Convert QuestionSegment conversation to MvpSessionTurn format for AI service
      const historyForAI: MvpSessionTurn[] = currentQuestion.conversation.map((turn, _index) => ({
        id: `turn-${turn.timestamp}-${turn.role}`,
        role: turn.role === 'ai' ? 'model' : 'user',
        text: turn.content,
        timestamp: new Date(turn.timestamp),
        rawAiResponseText: turn.role === 'ai' ? turn.content : undefined,
      }));

      console.log('🔍 [SESSION] Calling continueConversation...');
      const aiResponse = await continueConversation(
        session.jdResumeText,
        persona,
        historyForAI,
        input.userResponse
      );
      console.log('✅ [SESSION] AI response generated successfully');

      // Add AI follow-up to conversation
      const aiTurn: ConversationTurn = {
        role: "ai",
        content: aiResponse.followUpQuestion,
        timestamp: new Date().toISOString(),
        messageType: "response"
      };

      currentQuestion.conversation.push(aiTurn);
      console.log('📝 [SESSION] Added AI turn to conversation');

      // Update database
      console.log('💾 [SESSION] Saving updated conversation to database...');
      await ctx.db.sessionData.update({
        where: { id: input.sessionId },
        data: { 
          questionSegments: questionSegments,
        }
      });
      console.log('✅ [SESSION] Session updated successfully');

      const result = {
        followUpQuestion: aiResponse.followUpQuestion,
        analysis: aiResponse.analysis,
        feedbackPoints: aiResponse.feedbackPoints,
        conversationHistory: currentQuestion.conversation,
        canProceedToNextTopic: currentQuestion.conversation.length >= 4, // Allow next topic after 2 exchanges
      };

      console.log('🎉 [SESSION] submitResponse completed successfully');
      return result;
    }),

  // 🟢 GREEN: moveToNextQuestion procedure for navigating pre-generated questions
  moveToNextQuestion: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .output(z.discriminatedUnion('isComplete', [
      z.object({
        isComplete: z.literal(false),
        questionText: z.string(),
        questionNumber: z.number(),
        totalQuestions: z.number(),
        keyPoints: z.array(z.string()),
      }),
      z.object({
        isComplete: z.literal(true),
        sessionId: z.string(),
        message: z.string(),
      }),
    ]))
    .mutation(async ({ ctx, input }) => {
      console.log('🚀 [SESSION] moveToNextQuestion called');
      console.log('📝 [SESSION] Session ID:', input.sessionId);
      console.log('📝 [SESSION] User ID:', ctx.session.user.id);

      // Find session and validate ownership
      const session = await ctx.db.sessionData.findUnique({
        where: { 
          id: input.sessionId, 
          userId: ctx.session.user.id 
        },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found or access denied',
        });
      }

      console.log('📝 [SESSION] Session found:', !!session);

      // Parse question segments
      let questionSegments: QuestionSegment[];
      try {
        questionSegments = zodQuestionSegmentArray.parse(session.questionSegments);
      } catch (error) {
        console.error('❌ [SESSION] Failed to parse questionSegments:', error);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session has incomplete or invalid question segments',
        });
      }

      console.log('📝 [SESSION] Question segments count:', questionSegments.length);

      // Check if session has pre-generated questions
      if (questionSegments.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session has no pre-generated questions available',
        });
      }

      const currentIndex = session.currentQuestionIndex ?? 0;
      console.log('📝 [SESSION] Current question index:', currentIndex);

      // Mark current question as completed
      if (questionSegments[currentIndex]) {
        questionSegments[currentIndex].endTime = new Date().toISOString();
        console.log('✅ [SESSION] Marked question', currentIndex + 1, 'as completed');
      }

      const nextIndex = currentIndex + 1;
      console.log('📝 [SESSION] Next question index:', nextIndex);

      // Check if we've completed all questions
      if (nextIndex >= questionSegments.length) {
        console.log('🎉 [SESSION] Interview completed - all questions answered');
        
        // Mark session as ended
        await ctx.db.sessionData.update({
          where: { id: input.sessionId },
          data: {
            questionSegments: JSON.parse(JSON.stringify(questionSegments)) as Prisma.InputJsonValue,
            currentQuestionIndex: nextIndex,
            status: 'completed',
            endTime: new Date(),
            updatedAt: new Date(),
          },
        });

        return {
          isComplete: true,
          sessionId: input.sessionId,
          message: `Interview completed! You have successfully answered ${questionSegments.length} questions.`,
        };
      }

      // Navigate to next question
      const nextQuestion = questionSegments[nextIndex];
      if (!nextQuestion) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Next question not found in session',
        });
      }
      
      console.log('📝 [SESSION] Next question:', nextQuestion.question.substring(0, 50) + '...');

      // Mark next question as started
      nextQuestion.startTime = new Date().toISOString();
      
      // Add AI question to conversation if not already present
      if (nextQuestion.conversation.length === 0) {
        nextQuestion.conversation.push({
          role: 'ai',
          content: nextQuestion.question,
          timestamp: new Date().toISOString(),
          messageType: 'question',
        });
      }

      // Update database with navigation changes
      await ctx.db.sessionData.update({
        where: { id: input.sessionId },
        data: {
          questionSegments: JSON.parse(JSON.stringify(questionSegments)) as Prisma.InputJsonValue,
          currentQuestionIndex: nextIndex,
          updatedAt: new Date(),
        },
      });

      console.log('✅ [SESSION] Successfully navigated to question', nextIndex + 1);
      console.log('🎉 [SESSION] moveToNextQuestion completed successfully');

      return {
        isComplete: false,
        questionText: nextQuestion.question,
        questionNumber: nextQuestion.questionNumber,
        totalQuestions: questionSegments.length,
        keyPoints: nextQuestion.keyPoints,
      };
    }),

  // NEW: saveSession procedure for saving progress or ending the session
  saveSession: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      endSession: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, endSession } = input;

      const updateData: { endTime?: Date, updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (endSession) {
        updateData.endTime = new Date();
      }

      await ctx.db.sessionData.update({
        where: { id: sessionId, userId: ctx.session.user.id },
        data: updateData,
      });

      return {
        saved: true,
        ended: endSession,
      };
    }),

  /**
   * Voice Modality – transcribe audio and store response
   */
  transcribeVoice: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      // Accept any blob-like object; during unit tests this will be a real Blob.
      audioBlob: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, audioBlob } = input;

      // Ensure session belongs to user
      const sessionRecord = await db.sessionData.findUnique({
        where: { id: sessionId, userId: ctx.session.user.id },
      });
      if (!sessionRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      // Call STT provider
      const transcript = await sttTranscribe(audioBlob as Blob | Buffer);

      // Persist response (simplified – append to questionSegments conversation)
      try {
        const qSegments = sessionRecord.questionSegments as unknown as QuestionSegment[];
        const currentIdx = sessionRecord.currentQuestionIndex ?? 0;
        const nowIso = new Date().toISOString();
        if (qSegments[currentIdx]) {
          qSegments[currentIdx].conversation.push({ role: 'user', content: transcript, timestamp: nowIso, messageType: 'transcript' } as unknown as ConversationTurn);
        }
        await db.sessionData.update({
          where: { id: sessionId },
          data: { questionSegments: JSON.parse(JSON.stringify(qSegments)) as any },
        });
      } catch (err) {
        // Log and continue – persistence failures shouldn't break the mutation
        console.error('Failed to persist transcript', err);
      }

      return { transcript };
    }),

  /**
   * Generate ephemeral token for secure client-side Live API access
   * 
   * Eliminates the need to expose GEMINI_API_KEY in the frontend by generating
   * short-lived tokens that can be safely used in browsers.
   * 
   * @see https://ai.google.dev/gemini-api/docs/ephemeral-tokens#javascript
   */
  generateEphemeralToken: protectedProcedure
    .input(z.object({
      sessionId: z.string().min(1, 'Session ID is required'),
      ttlMinutes: z.number().min(1).max(120).optional().default(35), // Max 2 hours
    }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, ttlMinutes } = input;

      // Validate user owns the session
      const session = await ctx.db.sessionData.findUnique({
        where: { 
          id: sessionId,
          userId: ctx.session.user.id,
        },
        select: { id: true }, // Only select what we need for authorization
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found or access denied',
        });
      }

      try {
        // Use the utility function for token generation
        const tokenResponse = await generateEphemeralToken({ 
          ttlMinutes,
          uses: 1 
        });

        return tokenResponse;
      } catch (error: unknown) {
        // Enhanced error handling with proper tRPC error codes
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (errorMessage.includes('quota')) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'API quota exceeded. Please try again later.',
          });
        }
        
        if (errorMessage.includes('authentication') || errorMessage.includes('API key')) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid API key configuration',
          });
        }
        
        if (errorMessage.includes('not configured')) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Gemini API key not configured',
          });
        }
        
        // Re-throw as internal server error for unexpected errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate ephemeral token',
          cause: error,
        });
      }
    }),
});

export type SessionRouter = typeof sessionRouter; 