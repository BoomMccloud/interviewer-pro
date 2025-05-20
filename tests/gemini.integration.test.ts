// tests/gemini.integration.test.ts

// IMPORTANT: This test suite makes ACTUAL API CALLS to the Gemini API.
// Ensure your GEMINI_API_KEY is correctly configured in your environment.

import 'dotenv/config';
import { getFirstQuestion, continueInterview, parseAiResponse } from '../src/lib/gemini';
import type { JdResumeText, Persona, MvpSessionTurn, MvpAiResponse } from '../src/types';

// Minimal viable mock data for testing live API calls
const mockJdResumeTextIntegration: JdResumeText = {
  id: 'int-test-jd-resume',
  userId: 'int-test-user',
  jdText: 'Job Description: Software Engineer. Focus on problem-solving and algorithms.',
  resumeText: 'Resume: Proficient in data structures and algorithms. Several projects on GitHub.',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPersonaIntegration: Persona = {
  id: 'technical-interviewer',
  name: 'Technical Interviewer',
  systemPrompt: 'You are a technical interviewer. Ask one coding-related question based on the resume and JD. Keep your first question concise.',
};

describe('Gemini Service - Integration Tests (Live API)', () => {
  // Increase timeout for integration tests if needed, as API calls can be slow
  // jest.setTimeout(30000); // 30 seconds, for example

  describe('getFirstQuestion (Live API)', () => {
    it('should receive a questionText and rawAiResponseText from the live API', async () => {
      try {
        const result = await getFirstQuestion(mockJdResumeTextIntegration, mockPersonaIntegration);

        console.log('[INTEGRATION TEST - getFirstQuestion] Raw AI Response:', result.rawAiResponseText);

        expect(result).toBeDefined();
        expect(result.questionText).toBeDefined();
        expect(typeof result.questionText).toBe('string');
        expect(result.questionText.length).toBeGreaterThan(5); // Plausibility: question is not empty
        expect(result.rawAiResponseText).toBeDefined();
        expect(typeof result.rawAiResponseText).toBe('string');
        expect(result.rawAiResponseText.length).toBeGreaterThan(10); // Plausibility: raw response has content

        // Attempt to parse the raw response to see if it roughly follows the expected structure
        const parsedFromRaw = parseAiResponse(result.rawAiResponseText);
        expect(parsedFromRaw.nextQuestion).toEqual(result.questionText); // The parsed question should match
        expect(parsedFromRaw.analysis).toBeDefined();
        expect(parsedFromRaw.feedbackPoints).toBeDefined();
        expect(parsedFromRaw.suggestedAlternative).toBeDefined();

      } catch (error) {
        console.error('[INTEGRATION TEST - getFirstQuestion] Test failed with error:', error);
        // We still want the test to fail if an error occurs, but logging helps debug CI/environment issues.
        throw error;
      }
    });
  });

  describe('continueInterview (Live API)', () => {
    it('should receive a structured response when continuing an interview', async () => {
      // Step 1: Get the first question to establish a starting point for history
      const firstTurn = await getFirstQuestion(mockJdResumeTextIntegration, mockPersonaIntegration);
      expect(firstTurn.questionText).toBeDefined();
      expect(firstTurn.rawAiResponseText).toBeDefined();

      // Step 2: Simulate a user response to the first question
      const userFirstResponse = "I used a Breadth-First Search (BFS) on an adjacency list representation of a graph to find the shortest path in a social network recommendation feature. The time complexity was O(V + E), where V is vertices and E is edges.";

      // Step 3: Construct the history for continueInterview
      const history: MvpSessionTurn[] = [
        {
          id: 'turn-1-model',
          role: 'model', // AI's first turn (the question)
          text: firstTurn.questionText, // Just the question text part for history's 'text' field
          rawAiResponseText: firstTurn.rawAiResponseText, // Full raw response for context
          timestamp: new Date(),
        },
        {
          id: 'turn-2-user',
          role: 'user',
          text: userFirstResponse,
          timestamp: new Date(),
        },
      ];

      try {
        // Step 4: Call continueInterview
        const result = await continueInterview(
          mockJdResumeTextIntegration,
          mockPersonaIntegration,
          history, // Pass the constructed history
          userFirstResponse // This is the user's current utterance that the AI will respond to
        );

        console.log('[INTEGRATION TEST - continueInterview] Raw AI Response:', result.rawAiResponseText);

        expect(result).toBeDefined();
        expect(result.nextQuestion).toBeDefined();
        expect(typeof result.nextQuestion).toBe('string');
        expect(result.nextQuestion.length).toBeGreaterThan(5);

        expect(result.analysis).toBeDefined();
        expect(typeof result.analysis).toBe('string');
        // Analysis could be short, so no strict length check, just existence

        expect(result.feedbackPoints).toBeDefined();
        expect(Array.isArray(result.feedbackPoints)).toBe(true);
        // It's okay if feedbackPoints is empty, but it should be an array

        expect(result.suggestedAlternative).toBeDefined();
        expect(typeof result.suggestedAlternative).toBe('string');
        // Suggested alternative could also be short

        expect(result.rawAiResponseText).toBeDefined();
        expect(typeof result.rawAiResponseText).toBe('string');
        expect(result.rawAiResponseText.length).toBeGreaterThan(10);

        // Optional: A light check to see if the raw response contains expected delimiters
        expect(result.rawAiResponseText).toMatch(/<QUESTION>/);
        expect(result.rawAiResponseText).toMatch(/<ANALYSIS>/);
        expect(result.rawAiResponseText).toMatch(/<FEEDBACK>/);
        expect(result.rawAiResponseText).toMatch(/<SUGGESTED_ALTERNATIVE>/);

      } catch (error) {
        console.error('[INTEGRATION TEST - continueInterview] Test failed with error:', error);
        throw error;
      }
    });
  });
}); 