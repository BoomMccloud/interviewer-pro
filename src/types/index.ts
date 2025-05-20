// src/types/index.ts

// --- General Types ---

// Define standard roles for conversation turns
export type ChatRole = 'user' | 'model' | 'system'; // 'system' potentially for internal messages, 'model' is the AI


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
export type PersonaId = 'technical-lead';


// --- JD/Resume Text Types (for MVP copy/paste) ---

// Represents the copy/pasted JD and Resume text for a user
// In MVP, this is stored per user, not per JD Target like the long-term plan
export interface MvpJdResumeText {
  id: string; // Database ID for this text entry
  userId: string; // ID of the user who saved this text
  jdText: string; // The full raw text of the Job Description
  resumeText: string; // The full raw text of the Resume
  createdAt: Date;
  updatedAt: Date;
  // Link to sessions conducted using this text (handled by Prisma relations)
}


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
// Stored in the database as part of MvpSessionData
export interface MvpSessionTurn {
  id: string; // Database ID for the turn (if stored as separate records) or index in array
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

// Represents the state and history of a single MVP interview session
export interface MvpSessionData {
  id: string; // Database ID for the session
  userId: string; // ID of the user conducting the session
  mvpJdResumeTextId: string; // ID linking to the specific JD/Resume text used
  personaId: PersonaId; // ID of the persona used (always 'technical-lead' for MVP)
  startTime: Date; // When the session started
  endTime?: Date; // When the session ended (if completed)
  durationInSeconds: number; // Total configured duration
  status: 'in-progress' | 'completed' | 'cancelled' | 'error'; // Current status

  // Array of turns in the conversation. Ordered chronologically.
  // Prisma might store this as related records, or a JSON array depending on your schema.
  history: MvpSessionTurn[];

  // Fields needed for the report summary (can be calculated upon session completion or fetched)
  // For MVP, maybe just a simple overall assessment string?
  overallSummary?: string; // Example: "Overall performance was good, but could improve structure."

  createdAt: Date; // When the session record was created
  updatedAt: Date; // When the session record was last updated
}

// --- User Type (Minimal for MVP Auth) ---

// Represents a user in the database
export interface MvpUser {
    id: string; // User's unique ID from NextAuth/database
    email?: string | null; // Optional email
    name?: string | null; // Optional name
    image?: string | null; // Optional profile image URL
    // Add relationships to MvpJdResumeText and MvpSessionData if needed
    // mvpJdResumeTexts?: MvpJdResumeText[];
    // mvpSessions?: MvpSessionData[];
}

// --- Other potential types for frontend/API ---

// Example type for data returned by /api/mvp-sessions/[id]/report
export interface MvpReportData {
    sessionId: string;
    status: MvpSessionData['status'];
    startTime: string; // Format dates as strings for frontend
    endTime?: string;
    durationConfigured: number; // Total seconds configured
    durationActual?: number; // Actual seconds session lasted (if ended naturally)
    personaName: string; // Get from Persona via personaId

    overallSummary: string; // Overall assessment

    // Structured history with all details needed for display
    turns: Array<MvpSessionTurn>; // Contains text, analysis, feedback, alternative
}