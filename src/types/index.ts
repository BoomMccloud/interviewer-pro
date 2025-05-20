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


// --- Renaming Prisma's generated types for clarity in this file, if preferred, or use directly ---
// Alternatively, you can use User, JdResumeText, SessionData directly from @prisma/client where needed.
// For this example, we'll alias them if we want to keep "Mvp" prefix in *this file's* exports for some reason,
// but it's often cleaner to just use the Prisma names directly in consuming code.
// For now, let's assume we'll use Prisma's names directly and remove the Mvp-prefixed ones.

// export type MvpUser = User; // Now using Prisma's User directly
// export type MvpJdResumeText = JdResumeText; // Now using Prisma's JdResumeText directly
// export type MvpSessionData = SessionData; // Now using Prisma's SessionData directly

// --- AI Response & Feedback Types ---

// Represents the structured output expected from the AI after parsing its raw response
export interface MvpAiResponse {
  nextQuestion: string; // The question the AI asks next
  analysis: string; // AI's analysis of the user's *previous* answer
  feedbackPoints: string[]; // Specific points of feedback for the *previous* answer
  suggestedAlternative: string; // A suggested better answer for the *previous* question
}


// --- Session History & State Types ---

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
    startTime: string; // Should be Date, convert to string in API response if needed
    endTime?: string | null; // Align with SessionData['endTime'] (Date | null)
    durationConfigured: number; // Corresponds to SessionData['durationInSeconds']
    durationActual?: number; // To be calculated
    personaName: string; // Will need to map SessionData['personaId'] to a name
    overallSummary?: string | null; // Align with SessionData['overallSummary']
    turns: Array<MvpSessionTurn>; 
}

// Exporting the Prisma generated types directly if they are to be used project-wide
// This makes it easy to import User, JdResumeText, SessionData from 'src/types'
// instead of '@prisma/client' everywhere, centralizing the source.
export type { User, JdResumeText, SessionData };