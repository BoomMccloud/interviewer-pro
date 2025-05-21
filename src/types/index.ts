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
  analysis: z.string().optional(),
  feedbackPoints: z.array(z.string()).optional(),
  suggestedAlternative: z.string().optional(),
});

export const zodMvpSessionTurnArray = z.array(zodMvpSessionTurn);

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