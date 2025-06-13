/**
 * tRPC router for session-related procedures.
 */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getFirstQuestion, continueConversation, getNewTopicalQuestion } from "~/lib/gemini";
import { getPersona } from "~/lib/personaService";
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

      if (!session.jdResumeText) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'JD/Resume text not found for this session.',
        });
      }

      // Generate first question using AI service, passing empty questionSegments
      const questionResult = await getFirstQuestion(session.jdResumeText, persona, []);
      
      // Create first question segment
      const firstQuestionSegment: QuestionSegment = {
        questionId: "q1_opening",
        questionNumber: 1,
        questionType: "opening",
        question: questionResult.questionText,
        keyPoints: questionResult.keyPoints, // Will be extracted from AI response
        startTime: new Date().toISOString(),
        endTime: null, // Active question
        conversation: [
          {
            role: "ai",
            content: questionResult.questionText,
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
      
      // Update session with question segments
      await ctx.db.sessionData.update({
        where: { id: input.sessionId },
        data: { 
          questionSegments: JSON.parse(JSON.stringify([firstQuestionSegment])) as Prisma.InputJsonValue,
          currentQuestionIndex: 0,
          startTime: new Date()
        },
      });
      
      return {
        sessionId: input.sessionId,
        isActive: true,
        personaId: input.personaId,
        currentQuestion: questionResult.questionText,
        keyPoints: firstQuestionSegment.keyPoints,
        questionNumber: 1,
        conversationHistory: firstQuestionSegment.conversation,
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
          isActive: session.endTime === null,
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
        isActive: session.endTime === null, // endTime === null means active
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
      // Fetch session with validation
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
        include: { jdResumeText: true }
      });

      if (!session || !session.jdResumeText) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session or required JD/Resume data not found' });
      }
      if (session.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authorized to access this session' });
      }

      // Parse question segments
      const questionSegments = zodQuestionSegmentArray.parse(session.questionSegments);
      const currentQuestionIndex = session.currentQuestionIndex;
      const currentQuestion = questionSegments[currentQuestionIndex];

      if (!currentQuestion) {
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

      // Get AI response (conversational follow-up, not new topic)
      const persona = await getPersona(session.personaId);
      if (!persona) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Persona not found' });
      }

      // Convert QuestionSegment conversation to MvpSessionTurn format for AI service
      const historyForAI: MvpSessionTurn[] = currentQuestion.conversation.map((turn, _index) => ({
        id: `turn-${turn.timestamp}-${turn.role}`,
        role: turn.role === 'ai' ? 'model' : 'user',
        text: turn.content,
        timestamp: new Date(turn.timestamp),
        rawAiResponseText: turn.role === 'ai' ? turn.content : undefined,
      }));

      const aiResponse = await continueConversation(
        session.jdResumeText,
        persona,
        historyForAI,
        input.userResponse
      );

      // Add AI conversational response
      const aiTurn: ConversationTurn = {
        role: "ai",
        content: aiResponse.followUpQuestion,
        timestamp: new Date().toISOString(),
        messageType: "response"
      };

      currentQuestion.conversation.push(aiTurn);

      // Update database
      await ctx.db.sessionData.update({
        where: { id: input.sessionId },
        data: { questionSegments: questionSegments }
      });

      return {
        conversationResponse: aiResponse.followUpQuestion,
        conversationHistory: currentQuestion.conversation,
        canProceedToNextTopic: currentQuestion.conversation.length >= 4, // 2+ exchanges
      };
    }),

  // NEW: getNextTopicalQuestion procedure for QuestionSegments structure  
  getNextTopicalQuestion: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch session with validation
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId },
        include: { jdResumeText: true }
      });

      if (!session || !session.jdResumeText) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session or required JD/Resume data not found' });
      }
      if (session.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authorized to access this session' });
      }

      const questionSegments = zodQuestionSegmentArray.parse(session.questionSegments);
      const currentQuestionIndex = session.currentQuestionIndex;

      // Mark current question as completed
      const currentQuestion = questionSegments[currentQuestionIndex];
      if (currentQuestion) {
        currentQuestion.endTime = new Date().toISOString();
      }

      // Check if we've reached the 3-question limit
      if (questionSegments.length >= 3) {
        // End the interview
        await ctx.db.sessionData.update({
          where: { id: input.sessionId },
          data: { 
            questionSegments: questionSegments, // Save the completed current question
            endTime: new Date() // Mark interview as completed
          }
        });

        return {
          isComplete: true,
          message: "Interview completed! You have successfully answered 3 questions.",
          totalQuestions: questionSegments.length,
          questionText: null,
          keyPoints: [],
          questionNumber: null,
          conversationHistory: [],
        };
      }

      // Get persona
      const persona = await getPersona(session.personaId);
      if (!persona) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Persona not found' });
      }

      // Convert question segments to legacy format for AI service
      const historyForAI: MvpSessionTurn[] = [];
      for (const segment of questionSegments) {
        for (const turn of segment.conversation) {
          historyForAI.push({
            id: `turn-${turn.timestamp}-${turn.role}`,
            role: turn.role === 'ai' ? 'model' : 'user',
            text: turn.content,
            timestamp: new Date(turn.timestamp),
            rawAiResponseText: turn.role === 'ai' ? turn.content : undefined,
          });
        }
      }

      // Generate next topical question
      const nextQuestionNumber = currentQuestionIndex + 2;
      const newTopicalQuestion = await getNewTopicalQuestion(
        session.jdResumeText,
        persona,
        historyForAI, // Pass all previous conversation for context
        [] // No covered topics tracking yet - can be enhanced later
      );

      // Create new question segment
      const newQuestionSegment: QuestionSegment = {
        questionId: `q${nextQuestionNumber}_topic${nextQuestionNumber - 1}`,
        questionNumber: nextQuestionNumber,
        questionType: "technical", // or determine based on context
        question: newTopicalQuestion.questionText,
        keyPoints: newTopicalQuestion.keyPoints,
        startTime: new Date().toISOString(),
        endTime: null,
        conversation: [
          {
            role: "ai",
            content: newTopicalQuestion.questionText,
            timestamp: new Date().toISOString(),
            messageType: "question"
          }
        ]
      };

      questionSegments.push(newQuestionSegment);
      const newQuestionIndex = currentQuestionIndex + 1;

      // Update database
      await ctx.db.sessionData.update({
        where: { id: input.sessionId },
        data: { 
          questionSegments: questionSegments,
          currentQuestionIndex: newQuestionIndex
        }
      });

      return {
        isComplete: false,
        message: null,
        totalQuestions: questionSegments.length,
        questionText: newTopicalQuestion.questionText,
        keyPoints: newTopicalQuestion.keyPoints,
        questionNumber: nextQuestionNumber,
        conversationHistory: newQuestionSegment.conversation,
      };
    }),

  // NEW: saveSession procedure for QuestionSegments structure
  saveSession: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      currentResponse: z.string().optional(),
      endSession: z.boolean().optional().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch session with validation
      const session = await ctx.db.sessionData.findUnique({
        where: { id: input.sessionId }
      });

      if (!session || session.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      // Prepare update data
      const updateData: { updatedAt: Date; endTime?: Date } = { 
        updatedAt: new Date() 
      };
      
      // If ending session, set endTime to mark completion
      if (input.endSession) {
        updateData.endTime = new Date();
      }
      
      await ctx.db.sessionData.update({
        where: { id: input.sessionId },
        data: updateData
      });

      return { 
        saved: true, 
        ended: input.endSession || false,
        timestamp: new Date() 
      };
    }),
});

export type SessionRouter = typeof sessionRouter; 