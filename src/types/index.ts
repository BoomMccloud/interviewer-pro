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
  questionType: 'opening' | 'technical' | 'behavioral' | 'followup' | 'topical';
  question: string;             // The actual question text
  keyPoints: string[];          // Array of guidance points
  startTime: string | null;     // ISO timestamp when question started, null if not started yet
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
  questionType: z.enum(['opening', 'technical', 'behavioral', 'followup', 'topical']),
  question: z.string(),
  keyPoints: z.array(z.string()),
  startTime: z.string().nullable(), // Allow null for questions that haven't started yet
  endTime: z.string().nullable(),
  conversation: z.array(zodConversationTurn),
});

export const zodQuestionSegmentArray = z.array(zodQuestionSegment);

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

// MvpSessionData is now imported from @prisma/client as SessionData.
// Its `history` field will be of type `Prisma.JsonValue`.
// In your application logic, you will cast this to `MvpSessionTurn[]`.

// --- User Type (Minimal for MVP Auth) ---
// MvpUser is now imported from @prisma/client as User.

// --- Other potential types for frontend/API ---

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
  questionCount: number; // Number of AI questions asked
  completionPercentage: number; // Percentage of session completed
  createdAt: Date;
  updatedAt: Date;
  averageResponseTime: number; // Average time to respond to questions in seconds
  personaId: string;
  jdResumeTextId: string;
}

export const zodSessionReportData = z.object({
  sessionId: z.string(),
  durationInSeconds: z.number(),
  questionCount: z.number(),
  completionPercentage: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  averageResponseTime: z.number(),
  personaId: z.string(),
  jdResumeTextId: z.string(),
});

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

export interface SessionFeedbackData {
  sessionId: string;
  overallScore: number; // Overall interview performance score (0-100)
  strengths: string[]; // Array of identified strengths
  areasForImprovement: string[]; // Array of areas needing improvement
  recommendations: string[]; // Array of actionable recommendations
  detailedAnalysis: string; // Comprehensive analysis text
  skillAssessment: Record<string, number>; // Skill categories and scores
}

// Zod schemas for analytics and feedback data
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
  skillAssessment: z.record(z.number()),
});


// Overall Assessment from LLM (for report generation)
export const zodOverallAssessment = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  score: z.number().min(1).max(10),
});

// Feedback for a single question (for report generation)
export const zodQuestionFeedback = z.object({
  contentFeedback: z.string(),
  clarityFeedback: z.string(),
  confidenceFeedback: z.string(),
  suggestedAnswer: z.string(),
});

// Used in report.ts router to define the full report structure
export interface FullReportData {
  session: SessionData;
  persona: Persona;
  jdResumeText: JdResumeText;
  overallAssessment: z.infer<typeof zodOverallAssessment>;
  questionFeedback: Record<string, z.infer<typeof zodQuestionFeedback>>;
}

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
export type QuestionFeedback = z.infer<typeof zodQuestionFeedback>;