// tests/gemini-helpers.test.ts

// Import the helper functions to be tested from lib/gemini.ts
import { buildSystemInstruction, buildPromptContents } from '../src/lib/gemini';

// Import necessary types for dummy data
import type { Persona, MvpSessionTurn } from '../src/types';
import type { JdResumeText } from '@prisma/client';
import type { Content } from '@google/genai';

describe('Gemini Service - Helper Functions', () => {
  const mockJdResumeText: JdResumeText = {
    id: 'test-jd-resume',
    userId: 'test-user',
    jdText: 'Job Description: Software Engineer. Requirements: Node.js, React.',
    resumeText: 'Resume: Experienced developer with Node.js and React skills.',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPersona: Persona = {
    id: 'test-persona',
    name: 'Test Interviewer',
    systemPrompt: 'You are a friendly interviewer.',
  };

  // --- Tests for buildSystemInstruction ---
  describe('buildSystemInstruction', () => {
    it('should correctly combine persona details into the system instruction', () => {
      const systemInstruction = buildSystemInstruction(mockPersona);
      expect(systemInstruction).toContain(`You are an AI simulating an interview.`);
      expect(systemInstruction).toContain(`act as a ${mockPersona.name}`);
      expect(systemInstruction).toContain(mockPersona.systemPrompt);
    });

    it.todo('should handle empty or minimal JD/Resume text gracefully');
    it.todo('should ensure critical formatting instructions are always present');
  });

  // --- Tests for buildPromptContents (or buildConversationHistory) ---
  describe('buildPromptContents', () => {
    it('should correctly format the initial prompt with persona, JD, Resume, and instructions (empty history)', () => {
      const emptyHistory: MvpSessionTurn[] = [];
      const contents: Content[] = buildPromptContents(mockJdResumeText, mockPersona, emptyHistory);

      expect(contents).toBeInstanceOf(Array);
      expect(contents.length).toBeGreaterThanOrEqual(1);

      const initialUserMessage = contents[0];
      if (!initialUserMessage || !initialUserMessage.parts) {
        throw new Error("Test setup failed: initialUserMessage or its parts are undefined.");
      }

      expect(initialUserMessage.role).toBe('user');
      expect(initialUserMessage.parts).toBeInstanceOf(Array);
      expect(initialUserMessage.parts.length).toBeGreaterThanOrEqual(4);

      const combinedPartsText = initialUserMessage.parts.map(part => (part as {text: string}).text).join('\n');

      const expectedSystemInstruction = buildSystemInstruction(mockPersona);
      expect(combinedPartsText).toContain(expectedSystemInstruction);

      expect(combinedPartsText).toContain(`Job Description:\n<JD>\n${mockJdResumeText.jdText}\n</JD>`);

      expect(combinedPartsText).toContain(`Candidate Resume:\n<RESUME>\n${mockJdResumeText.resumeText}\n</RESUME>`);

      expect(combinedPartsText).toContain('<QUESTION>');
      expect(combinedPartsText).toContain('</ANALYSIS>');
      expect(combinedPartsText).toContain('</FEEDBACK>');
      expect(combinedPartsText).toContain('</SUGGESTED_ALTERNATIVE>');
      expect(combinedPartsText).toContain('Example of how I expect your response to be structured:');
    });

    it('should correctly format a history with multiple user and model turns', () => {
      const nonEmptyHistory: MvpSessionTurn[] = [
        {
          id: 'turn-1',
          role: 'model',
          text: 'This is the AI question part.', // Display text
          rawAiResponseText: '<QUESTION>AI Question 1</QUESTION><ANALYSIS>...</ANALYSIS>', // Full raw response
          timestamp: new Date(Date.now() - 20000),
        },
        {
          id: 'turn-2',
          role: 'user',
          text: 'User answer to question 1.',
          timestamp: new Date(Date.now() - 10000),
        },
      ];

      const contents: Content[] = buildPromptContents(mockJdResumeText, mockPersona, nonEmptyHistory);

      // Expect the initial user message (system prompt, JD, resume, format instructions) + history turns
      expect(contents.length).toBe(1 + nonEmptyHistory.length);

      // Check the first history turn (model's output)
      const modelTurnContent = contents[1]; // 0 is the initial combined user message
      if (!modelTurnContent || !modelTurnContent.parts) throw new Error("modelTurnContent or parts undefined");
      expect(modelTurnContent.role).toBe('model');
      expect(modelTurnContent.parts[0]?.text).toBe(nonEmptyHistory[0]?.rawAiResponseText);

      // Check the second history turn (user's input)
      const userTurnContent = contents[2];
      if (!userTurnContent || !userTurnContent.parts) throw new Error("userTurnContent or parts undefined");
      expect(userTurnContent.role).toBe('user');
      expect(userTurnContent.parts[0]?.text).toBe(nonEmptyHistory[1]?.text);
    });

    // it.todo('should handle MvpSessionTurn objects and extract necessary text'); // This is covered by the above
  });
}); 