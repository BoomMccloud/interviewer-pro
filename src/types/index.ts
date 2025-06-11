// src/types/index.ts
import type { User, JdResumeText, SessionData } from '@prisma/client';
import { z } from 'zod';

// --- General Types ---

// Define standard roles for conversation turns
export type ChatRole = 'user' | 'model' | 'system'; // 'system' potentially for internal messages, 'model' is the AI
export const zodChatRole = z.enum(['user', 'model', 'system']);


// --- Persona Types ---

// Represents the definition of an interviewer persona
export interface Persona {
  id: string; // Unique identifier for the persona (e.g., 'technical-lead')
  name: string; // Display name (e.g., 'Technical Lead')
  systemPrompt: string; // The core instruction text for the AI for this persona
  description?: string; // Optional brief description for the user
  // Add fields for future assets (avatar, voice ID, etc.) here, initially optional
  avatarImageUrl?: string;
  live2dModelUrl?: string;
  voiceProfileId?: string;
}

// 🎯 TYPE-SAFE PERSONA CONSTANTS
// These constants ensure consistency between frontend and backend
export const PERSONA_IDS = {
  SWE_INTERVIEWER_STANDARD: 'swe-interviewer-standard',
  BEHAVIORAL_INTERVIEWER_FRIENDLY: 'behavioral-interviewer-friendly',
  HR_RECRUITER_GENERAL: 'hr-recruiter-general',
} as const;

export type PersonaId = typeof PERSONA_IDS[keyof typeof PERSONA_IDS];

// Validation schema for PersonaId
export const zodPersonaId = z.enum([
  PERSONA_IDS.SWE_INTERVIEWER_STANDARD,
  PERSONA_IDS.BEHAVIORAL_INTERVIEWER_FRIENDLY,
  PERSONA_IDS.HR_RECRUITER_GENERAL,
]);

// 🎯 SESSION STATE CONSTANTS
export const SESSION_STATES = {
  LOADING: 'loading',
  NEW: 'new', 
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type SessionState = typeof SESSION_STATES[keyof typeof SESSION_STATES];

// 🎯 INTERVIEW MODE CONSTANTS
export const INTERVIEW_MODES = {
  TEXT: 'text',
  VOICE: 'voice',
  AVATAR: 'avatar',
} as const;

export type InterviewMode = typeof INTERVIEW_MODES[keyof typeof INTERVIEW_MODES];

// Validation schema for InterviewMode
export const zodInterviewMode = z.enum([
  INTERVIEW_MODES.TEXT,
  INTERVIEW_MODES.VOICE,
  INTERVIEW_MODES.AVATAR,
]);

// Define specific persona IDs used in MVP (can expand later)
// This remains useful as SessionData.personaId is just `string` from Prisma
export type PersonaIdLegacy = 'technical-lead';


// --- Prisma Model Zod Schemas ---
// Define Zod schemas for Prisma models used in API input/output validation

export const zodJdResumeText = z.object({
  id: z.string(),
  userId: z.string(),
  jdText: z.string(),
  resumeText: z.string(),
  createdAt: z.coerce.date(), // Coerce to Date object from string/number
  updatedAt: z.coerce.date(),
});

// Represents a single turn in the interview conversation history
// Stored in the database as part of SessionData.history (JSON field)
export interface MvpSessionTurn {
  id: string; // Can be a unique ID for the turn, or simply an array index if only stored in SessionData.history
  role: ChatRole; // 'user' or 'model' (AI)
  text: string; // The display text (user's answer, AI's question part)
  // Store the full raw AI response text containing all delimited sections.
  // This is needed to pass the full context back to the AI in subsequent turns.
  rawAiResponseText?: string; // Only present for 'model' roles
  timestamp: Date; // When this turn occurred
  
  // Optional type field for special entries like pause, resume, etc.
  type?: 'pause' | 'resume' | 'end' | 'conversational' | 'topic_transition'; // Special turn types for session state management

  // Store the parsed feedback/analysis/alternative directly in the turn data.
  // This simplifies fetching data for the report. Only present for 'model' roles.
  analysis?: string;
  feedbackPoints?: string[];
  suggestedAlternative?: string;
}

export const zodMvpSessionTurn = z.object({
  id: z.string(),
  role: zodChatRole,
  text: z.string(),
  rawAiResponseText: z.string().optional(),
  timestamp: z.coerce.date(), // Coerce to Date object from string/number
  type: z.enum(['pause', 'resume', 'end', 'conversational', 'topic_transition']).optional(), // Optional type for special turn types
  analysis: z.string().optional(),
  feedbackPoints: z.array(z.string()).optional(),
  suggestedAlternative: z.string().optional(),
});

export const zodMvpSessionTurnArray = z.array(zodMvpSessionTurn);

// NEW: QuestionSegments Structure for Phase 3C Migration
// Represents a single conversation turn within a question segment
export interface ConversationTurn {
  role: 'ai' | 'user';
  content: string;
  timestamp: string;
  messageType: 'question' | 'response';
}

// Represents a complete question segment with its conversation history
export interface QuestionSegment {
  questionId: string;           // "q1_opening", "q2_topic1", "q3_behavioral"
  questionNumber: number;       // 1, 2, 3...
  questionType: 'opening' | 'technical' | 'behavioral' | 'followup';
  question: string;             // The actual question text
  keyPoints: string[];          // Array of guidance points
  startTime: string;            // ISO timestamp when question started
  endTime: string | null;       // ISO timestamp when completed, null if active
  conversation: ConversationTurn[]; // Chat history for this specific question
}

// Zod schemas for QuestionSegments structure
export const zodConversationTurn = z.object({
  role: z.enum(['ai', 'user']),
  content: z.string(),
  timestamp: z.string(),
  messageType: z.enum(['question', 'response']),
});

export const zodQuestionSegment = z.object({
  questionId: z.string(),
  questionNumber: z.number().int(),
  questionType: z.enum(['opening', 'technical', 'behavioral', 'followup']),
  question: z.string(),
  keyPoints: z.array(z.string()),
  startTime: z.string(),
  endTime: z.string().nullable(),
  conversation: z.array(zodConversationTurn),
});

export const zodQuestionSegmentArray = z.array(zodQuestionSegment);

// Current MVP AI Response (from continueInterview - will be deprecated)
export interface MvpAiResponse {
  nextQuestion: string;
  keyPoints: string[];
  analysis: string;
  feedbackPoints: string[];
  suggestedAlternative: string;
}

// NEW: Conversational Response (for continueConversation function)
export interface ConversationalResponse {
  analysis: string;
  feedbackPoints: string[];
  followUpQuestion: string;
  rawAiResponseText: string;
}

// NEW: Topical Question Response (for getNewTopicalQuestion function)  
export interface TopicalQuestionResponse {
  questionText: string;
  keyPoints: string[];
  rawAiResponseText: string;
}

// Define Zod schema for SessionData
export const zodSessionData = z.object({
  id: z.string(),
  userId: z.string(),
  personaId: z.string(),
  jdResumeTextId: z.string(),
  // The history field is stored as JSON in Prisma, but we expect an array of MvpSessionTurn objects
  history: zodMvpSessionTurnArray, // Use the previously defined schema for turns
  durationInSeconds: z.number(),
  overallSummary: z.string().nullable(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// MvpSessionData is now imported from @prisma/client as SessionData.
// Its `history` field will be of type `Prisma.JsonValue`.
// In your application logic, you will cast this to `MvpSessionTurn[]`.

// --- User Type (Minimal for MVP Auth) ---
// MvpUser is now imported from @prisma/client as User.

// --- Other potential types for frontend/API ---

// Example type for data returned by /api/mvp-sessions/[id]/report
export interface MvpReportData {
    sessionId: string;
    // status: SessionData['status']; // Status was removed, derived from endTime
    startTime: Date; // Changed to Date to match Zod schema
    endTime?: Date | null; // Align with SessionData['endTime'] (Date | null)
    durationConfigured: number; // Corresponds to SessionData['durationInSeconds']
    durationActual?: number; // To be calculated
    personaName: string; // Will need to map SessionData['personaId'] to a name
    overallSummary?: string | null; // Align with SessionData['overallSummary']
    turns: Array<MvpSessionTurn>; 
}

// Define Zod schema for MvpReportData
export const zodMvpReportData = z.object({
  sessionId: z.string(),
  startTime: z.coerce.date(), // Expecting ISO string from API, coerce to Date
  endTime: z.coerce.date().nullable(),
  durationConfigured: z.number(),
  durationActual: z.number().optional(),
  personaName: z.string(),
  overallSummary: z.string().nullable().optional(),
  turns: z.array(zodMvpSessionTurn), // Use the schema for individual turns
});

// Exporting the Prisma generated types directly if they are to be used project-wide
// This makes it easy to import User, JdResumeText, SessionData from 'src/types'
// instead of '@prisma/client' everywhere, centralizing the source.
export type { User, JdResumeText, SessionData };

// ===================================================================
// Phase 2A: Session Reports & Analytics Types
// ===================================================================

// Return type for getSessionReport procedure
export interface SessionReportData {
  sessionId: string;
  durationInSeconds: number;
  history: MvpSessionTurn[];
  questionCount: number; // Number of AI questions asked
  completionPercentage: number; // Percentage of session completed
  createdAt: Date;
  updatedAt: Date;
  averageResponseTime: number; // Average time to respond to questions in seconds
  personaId: string;
  jdResumeTextId: string;
}

// Return type for getSessionAnalytics procedure
export interface SessionAnalyticsData {
  sessionId: string;
  totalQuestions: number; // Total number of AI questions
  totalAnswers: number; // Total number of user responses
  averageResponseTime: number; // Average response time in seconds
  responseTimeMetrics: number[]; // Array of individual response times
  completionPercentage: number; // Percentage of questions answered
  sessionDurationMinutes: number; // Total session duration in minutes
  performanceScore: number; // Overall performance score (0-100)
}

// Return type for getSessionFeedback procedure
export interface SessionFeedbackData {
  sessionId: string;
  overallScore: number; // Overall interview performance score (0-100)
  strengths: string[]; // Array of identified strengths
  areasForImprovement: string[]; // Array of areas needing improvement
  recommendations: string[]; // Array of actionable recommendations
  detailedAnalysis: string; // Comprehensive analysis text
  skillAssessment: Record<string, number>; // Skill categories and scores
}

// Zod schemas for validation
export const zodSessionReportData = z.object({
  sessionId: z.string(),
  durationInSeconds: z.number(),
  history: zodMvpSessionTurnArray,
  questionCount: z.number(),
  completionPercentage: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  averageResponseTime: z.number(),
  personaId: z.string(),
  jdResumeTextId: z.string(),
});

export const zodSessionAnalyticsData = z.object({
  sessionId: z.string(),
  totalQuestions: z.number(),
  totalAnswers: z.number(),
  averageResponseTime: z.number(),
  responseTimeMetrics: z.array(z.number()),
  completionPercentage: z.number(),
  sessionDurationMinutes: z.number(),
  performanceScore: z.number(),
});

export const zodSessionFeedbackData = z.object({
  sessionId: z.string(),
  overallScore: z.number(),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  recommendations: z.array(z.string()),
  detailedAnalysis: z.string(),
  skillAssessment: z.record(z.string(), z.number()),
});

// ==============================================
// Phase 3A: Live Interview Session Types (TDD)
// ==============================================

/**
 * Active session state for live interviews
 * Used to track real-time interview progress and state
 */
export interface ActiveSessionData {
  sessionId: string;
  status: 'created' | 'active' | 'paused' | 'completed' | 'abandoned';
  personaId: string;
  currentQuestion: string;
  keyPoints: string[];                      // NEW: Key points for current question
  questionNumber: number;
  totalQuestions: number;
  timeRemaining: number; // in seconds
  conversationHistory: ConversationTurn[];  // NEW: Current question's conversation using new structure
  questionSegments: QuestionSegment[];      // NEW: All question segments
  currentQuestionIndex: number;             // NEW: Which question is active
  canProceedToNextTopic: boolean;           // NEW: Whether user can advance to next topic
  startTime: Date;
  lastActivityTime: Date;
  endTime?: Date;
}

/**
 * Interview persona configuration
 * Defines different interviewer personalities and styles
 */
export interface InterviewPersona {
  id: string;
  name: string;
  description: string;
  style: 'technical' | 'behavioral' | 'case-study' | 'general';
  personality: string;
  questionStyle: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Request format for starting an interview session
 */
export interface StartInterviewSessionRequest {
  sessionId: string;
  personaId: string;
}

/**
 * Response format for starting an interview session
 */
export interface StartInterviewSessionResponse {
  sessionId: string;
  status: 'active';
  personaId: string;
  currentQuestion: string;
  questionNumber: number;
  totalQuestions: number;
  timeRemaining: number;
  conversationHistory: MvpSessionTurn[];
}



// ==============================================
// Zod Schemas for Phase 3A Types
// ==============================================

export const zodActiveSessionData = z.object({
  sessionId: z.string(),
  status: z.enum(['created', 'active', 'paused', 'completed', 'abandoned']),
  personaId: z.string(),
  currentQuestion: z.string(),
  keyPoints: z.array(z.string()),
  questionNumber: z.number().int(),
  totalQuestions: z.number().int(),
  timeRemaining: z.number().int(),
  conversationHistory: z.array(zodConversationTurn),
  questionSegments: z.array(zodQuestionSegment),
  currentQuestionIndex: z.number().int(),
  canProceedToNextTopic: z.boolean(),
  startTime: z.date(),
  lastActivityTime: z.date(),
  endTime: z.date().optional(),
});

export const zodInterviewPersona = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  style: z.enum(['technical', 'behavioral', 'case-study', 'general']),
  personality: z.string(),
  questionStyle: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});

export const zodStartInterviewSessionRequest = z.object({
  sessionId: z.string(),
  personaId: z.string(),
});



// ===================================================================
// Question Generation API Types
// ===================================================================

// Question type categories for different stages of interview
export type QuestionType = 'opening' | 'technical' | 'behavioral' | 'followup';

// Response from generateInterviewQuestion API
export interface GeneratedQuestion {
  question: string;
  keyPoints: string[];
  questionType: QuestionType;
  personaId: string;
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedResponseTime: number; // in seconds
    tags: string[]; // categorization tags
  };
  rawAiResponse: string; // For session storage if needed
}

// Zod schema for validation
export const zodQuestionType = z.enum(['opening', 'technical', 'behavioral', 'followup']);

export const zodGeneratedQuestion = z.object({
  question: z.string(),
  keyPoints: z.array(z.string()),
  questionType: zodQuestionType,
  personaId: z.string(),
  metadata: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']),
    estimatedResponseTime: z.number(),
    tags: z.array(z.string()),
  }),
  rawAiResponse: z.string(),
});

export interface FeedbackConversation {
  id: string;
  userId: string;
  sessionDataId: string;
  questionId: string;
  history: { role: 'user' | 'ai'; content: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export type OverallAssessment = z.infer<typeof zodOverallAssessment>;
export const zodOverallAssessment = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  score: z.number(),
});

// ===================================================================