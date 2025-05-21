/**
 * @fileoverview Utility functions for making API calls to the backend.
 *
 * This file provides helper functions to interact with the MVP backend API endpoints.
 * It handles fetch requests, response parsing, and basic error handling.
 */

import { type JdResumeText, zodJdResumeText, type SessionData, zodSessionData, type MvpSessionTurn, type MvpReportData, zodMvpReportData } from '~/types'; // Import necessary types and schemas
import { z } from 'zod';

const API_BASE_URL = '/api'; // Base URL for our API endpoints

/**
 * Fetches the saved Job Description and Resume text for the current user.
 * @returns A promise that resolves with the JdResumeText object or null if not found.
 */
export async function getMvpJdResumeText(): Promise<JdResumeText | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/mvp-jd-resume-text`);

    if (!response.ok) {
      // Handle non-2xx responses, e.g., 404 if no text is saved
      if (response.status === 404) {
        return null; // No saved text found
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    // Validate the received data against the Zod schema
    const validatedData = zodJdResumeText.parse(data); // Zod will throw if validation fails
    return validatedData;
  } catch (error) {
    console.error('Error fetching JD/Resume text:', error);
    // Re-throw the error or return a specific error object/null depending on desired error handling strategy
    throw error; // Re-throwing for now
  }
}

/**
 * Saves or updates the Job Description and Resume text for the current user.
 * @param data The JdResumeText object to save.
 * @returns A promise that resolves with the saved JdResumeText object.
 * @throws An error if the API request fails.
 */
export async function saveMvpJdResumeText(data: { jdText: string, resumeText: string }): Promise<JdResumeText> {
  try {
    const response = await fetch(`${API_BASE_URL}/mvp-jd-resume-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const responseData: unknown = await response.json();

    // Validate the received data against the Zod schema
    const validatedData = zodJdResumeText.parse(responseData);
    return validatedData;
  } catch (error) {
    console.error('Error saving JD/Resume text:', error);
    throw error; // Re-throwing for now
  }
}

/**
 * Creates a new interview session.
 * @param personaId The ID of the persona to use for the session.
 * @param jdResumeTextId The ID of the JD/Resume text to use for the session.
 * @returns A promise that resolves with an object containing the new session's ID.
 * @throws An error if the API request fails.
 */
export async function createMvpSession(personaId: string, jdResumeTextId: string): Promise<{ sessionId: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/mvp-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ personaId, jdResumeTextId }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    // Validate the response structure (expecting { sessionId: string })
    const sessionSchema = z.object({
      sessionId: z.string(),
    });
    const validatedData = sessionSchema.parse(data);

    return validatedData;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error; // Re-throwing for now
  }
}

/**
 * Fetches a list of all interview sessions associated with the current JD/Resume text.
 * @returns A promise that resolves with an array of SessionData objects.
 * @throws An error if the API request fails or the response data is invalid.
 */
export async function listMvpSessionsForCurrentText(): Promise<(Omit<SessionData, 'history'> & { history: MvpSessionTurn[] })[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/mvp-jd-resume-text/sessions`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    // Validate the received data against the Zod schema for an array of SessionData
    // Cast the result to the desired type after validation
    const validatedData = z.array(zodSessionData).parse(data);

    return validatedData as (Omit<SessionData, 'history'> & { history: MvpSessionTurn[] })[];
  } catch (error) {
    console.error('Error listing sessions:', error);
    throw error; // Re-throwing for now
  }
}

/**
 * Fetches the current state of a specific interview session.
 * @param sessionId The ID of the session to fetch.
 * @returns A promise that resolves with the SessionData object for the session.
 * @throws An error if the API request fails or the response data is invalid.
 */
export async function getSessionState(sessionId: string): Promise<Omit<SessionData, 'history'> & { history: MvpSessionTurn[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/mvp-sessions/${sessionId}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    // Validate the received data against the Zod schema for SessionData
    // Cast the result to the desired type after validation
    const validatedData = zodSessionData.parse(data);

    return validatedData as Omit<SessionData, 'history'> & { history: MvpSessionTurn[] };
  } catch (error) {
    console.error('Error fetching session state:', error);
    throw error; // Re-throwing for now
  }
}

/**
 * Continues an existing interview session with the user's answer.
 * @param sessionId The ID of the session to continue.
 * @param userAnswer The user's answer to the current question.
 * @returns A promise that resolves with the updated SessionData object.
 * @throws An error if the API request fails or the response data is invalid.
 */
export async function continueSession(sessionId: string, userAnswer: string): Promise<Omit<SessionData, 'history'> & { history: MvpSessionTurn[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/mvp-sessions/${sessionId}/continue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userAnswer }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    // Validate the received data against the Zod schema for SessionData
    // Cast the result to the desired type after validation
    const validatedData = zodSessionData.parse(data);

    return validatedData as Omit<SessionData, 'history'> & { history: MvpSessionTurn[] };
  } catch (error) {
    console.error('Error continuing session:', error);
    throw error; // Re-throwing for now
  }
}

/**
 * Ends an existing interview session and fetches the final report.
 * @param sessionId The ID of the session to end.
 * @returns A promise that resolves with the MvpReportData object.
 * @throws An error if the API request fails or the response data is invalid.
 */
export async function endSession(sessionId: string): Promise<MvpReportData> {
  try {
    const response = await fetch(`${API_BASE_URL}/mvp-sessions/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Optionally send a body if needed for ending the session, e.g., final feedback
      // body: JSON.stringify({ finalFeedback: '...' }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    // Validate the received data against the Zod schema for MvpReportData
    const validatedData = zodMvpReportData.parse(data);

    return validatedData;
  } catch (error) {
    console.error('Error ending session:', error);
    throw error; // Re-throwing for now
  }
}

/**
 * Fetches the final report for a specific interview session.
 * @param sessionId The ID of the session to fetch the report for.
 * @returns A promise that resolves with the MvpReportData object.
 * @throws An error if the API request fails or the response data is invalid.
 */
export async function getSessionReport(sessionId: string): Promise<MvpReportData> {
  try {
    const response = await fetch(`${API_BASE_URL}/mvp-sessions/${sessionId}/report`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();

    // Validate the received data against the Zod schema for MvpReportData
    const validatedData = zodMvpReportData.parse(data);

    return validatedData;
  } catch (error) {
    console.error('Error fetching session report:', error);
    throw error; // Re-throwing for now
  }
}

// TODO: Add other API utility functions as needed based on the frontend plan:
// - getSessionReport(sessionId: string): Promise<MvpReportData> 