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

// Define specific persona IDs used in MVP (can expand later)
// This remains useful as SessionData.personaId is just `string` from Prisma
export type PersonaId = 'technical-lead'; 


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
  type?: 'pause' | 'resume' | 'end'; // Special turn types for session state management

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
  type: z.enum(['pause', 'resume', 'end']).optional(), // Optional type for special turn types
  analysis: z.string().optional(),
  feedbackPoints: z.array(z.string()).optional(),
  suggestedAlternative: z.string().optional(),
});

export const zodMvpSessionTurnArray = z.array(zodMvpSessionTurn);

// AI Response structure for gemini service
export interface MvpAiResponse {
  questionText?: string; // For getFirstQuestion
  nextQuestion?: string; // For continueInterview
  analysis?: string;
  feedbackPoints?: string[];
  suggestedAlternative?: string;
  rawAiResponseText?: string;
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
  questionNumber: number;
  totalQuestions: number;
  timeRemaining: number; // in seconds
  conversationHistory: MvpSessionTurn[];
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

/**
 * Request format for getting next question
 */
export interface GetNextQuestionRequest {
  sessionId: string;
  userResponse: string;
}

/**
 * Response format for getting next question
 */
export interface GetNextQuestionResponse {
  nextQuestion: string | null; // null indicates interview completion
  questionNumber: number;
  isComplete: boolean;
  conversationHistory: MvpSessionTurn[];
}

/**
 * Request format for updating session state
 */
export interface UpdateSessionStateRequest {
  sessionId: string;
  action: 'pause' | 'resume' | 'end';
  currentResponse?: string;
}

/**
 * Response format for updating session state
 */
export interface UpdateSessionStateResponse {
  status: 'active' | 'paused' | 'completed';
  lastActivityTime: string;
  endTime?: string;
}

/**
 * Request format for getting active session
 */
export interface GetActiveSessionRequest {
  sessionId: string;
}

// ==============================================
// Zod Schemas for Phase 3A Types
// ==============================================

export const zodActiveSessionData = z.object({
  sessionId: z.string(),
  status: z.enum(['created', 'active', 'paused', 'completed', 'abandoned']),
  personaId: z.string(),
  currentQuestion: z.string(),
  questionNumber: z.number().int().positive(),
  totalQuestions: z.number().int().positive(),
  timeRemaining: z.number().int().min(0),
  conversationHistory: z.array(zodMvpSessionTurn),
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

export const zodGetNextQuestionRequest = z.object({
  sessionId: z.string(),
  userResponse: z.string(),
});

export const zodUpdateSessionStateRequest = z.object({
  sessionId: z.string(),
  action: z.enum(['pause', 'resume', 'end']),
  currentResponse: z.string().optional(),
});

export const zodGetActiveSessionRequest = z.object({
  sessionId: z.string(),
});