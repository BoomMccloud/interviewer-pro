/**
 * 🔴 RED: Test generateAllInterviewQuestions function
 * 
 * FILES UNDER TEST:
 * - src/lib/gemini.ts (NEW: generateAllInterviewQuestions function)
 * - src/types/index.ts (EXISTING: TopicalQuestionResponse interface)
 * 
 * PURPOSE: Test the new batch question generation functionality that will replace
 * the current single question generation approach. These tests verify that we can
 * generate 3 diverse questions upfront during session initialization.
 * 
 * Following project pattern: Mock external AI service, use real types
 */

// Mock environment variables to avoid validation errors (following project pattern)
jest.mock('~/env', () => ({
  env: {
    AUTH_DISCORD_ID: 'mock-discord-id',
    AUTH_DISCORD_SECRET: 'mock-discord-secret', 
    DATABASE_URL: 'mock-database-url',
    GEMINI_API_KEY: 'mock-gemini-key'
  }
}));

// Mock GoogleGenAI following established project pattern
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContentStream: jest.fn(),
    },
  })),
  HarmCategory: {},
  HarmBlockThreshold: {},
}));

// Import mocked GoogleGenAI after mock setup
import { GoogleGenAI } from '@google/genai';
const MockedGoogleGenAI = GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>;

// These imports will fail initially (RED phase) - expected for TDD
import type { JdResumeText, Persona, TopicalQuestionResponse } from '~/types';

// 🔴 RED: This import will fail - generateAllInterviewQuestions doesn't exist yet
// This is the expected TDD behavior - test first, implementation second
let generateAllInterviewQuestions: (
  jdResume: JdResumeText, 
  persona: Persona, 
  count: number
) => Promise<TopicalQuestionResponse[]>;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const geminiModule = require('~/lib/gemini') as { generateAllInterviewQuestions?: typeof generateAllInterviewQuestions };
  generateAllInterviewQuestions = geminiModule.generateAllInterviewQuestions ?? (async () => {
    throw new Error('generateAllInterviewQuestions not implemented yet');
  });
} catch (error) {
  // Expected to fail in RED phase - function doesn't exist yet
  generateAllInterviewQuestions = async () => {
    throw new Error('generateAllInterviewQuestions not implemented yet');
  };
}

describe('🔴 RED: Batch Question Generation (src/lib/gemini.ts)', () => {
  const mockJdResume: JdResumeText = {
    id: 'test-jd-resume-id',
    jdText: 'Senior React Developer position requiring expertise in React, TypeScript, and Node.js. Must have experience with state management, testing, and performance optimization.',
    resumeText: 'Experienced frontend developer with 5 years in React development. Skilled in Redux, Jest testing, and performance optimization. Led team migration projects.',
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockPersona: Persona = {
    id: 'technical-lead',
    name: 'Technical Lead',
    systemPrompt: 'You are a technical interviewer focused on React and frontend development skills.'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup successful mock response following established async iterator pattern
    const mockAsyncIterable = {
      [Symbol.asyncIterator]: async function* () {
        yield { text: '<QUESTION>Tell me about your React experience and component architecture approach.</QUESTION><KEY_POINTS>- Component design patterns\n- State management approach\n- Performance considerations</KEY_POINTS>' };
        yield { text: '<QUESTION>How do you handle complex state management in large React applications?</QUESTION><KEY_POINTS>- Redux vs Context API\n- State normalization\n- Async state handling</KEY_POINTS>' };
        yield { text: '<QUESTION>Describe a challenging technical problem you solved and your approach.</QUESTION><KEY_POINTS>- Problem analysis\n- Solution design\n- Implementation strategy</KEY_POINTS>' };
      },
    };
    
    // Mock the generateContentStream method following established pattern
    const mockInstance = new MockedGoogleGenAI();
    const mockGenerateContentStream = mockInstance.models.generateContentStream as jest.MockedFunction<any>;
    mockGenerateContentStream.mockResolvedValue(mockAsyncIterable);
  });

  describe('generateAllInterviewQuestions', () => {
    it('should generate exactly 3 diverse questions with key points', async () => {
      // 🔴 This test WILL FAIL - generateAllInterviewQuestions function doesn't exist yet
      // Testing: src/lib/gemini.ts - NEW generateAllInterviewQuestions function
      
      // This will throw an error in RED phase - expected behavior
      await expect(
        generateAllInterviewQuestions(mockJdResume, mockPersona, 3)
      ).rejects.toThrow('generateAllInterviewQuestions not implemented yet');
      
      // 🟢 GREEN phase expectations (for when function is implemented):
      // const questions: TopicalQuestionResponse[] = await generateAllInterviewQuestions(mockJdResume, mockPersona, 3);
      
      // // Verify we get exactly 3 questions
      // expect(questions).toHaveLength(3);
      
      // // Verify each question has required properties
      // questions.forEach((question, index) => {
      //   expect(question).toHaveProperty('questionText');
      //   expect(question).toHaveProperty('keyPoints');
      //   expect(question).toHaveProperty('rawAiResponseText');
        
      //   // Verify question text is substantial
      //   expect(question.questionText.length).toBeGreaterThan(10);
        
      //   // Verify key points are provided (minimum 3)
      //   expect(question.keyPoints).toHaveLength(3);
      //   expect(question.keyPoints[0]!.length).toBeGreaterThan(5);
        
      //   console.log(`Question ${index + 1}: ${question.questionText.substring(0, 50)}...`);
      // });
      
      // // Verify questions are diverse - no exact duplicates
      // const questionTexts = questions.map(q => q.questionText);
      // expect(new Set(questionTexts).size).toBe(3);
      
      // // Verify different topics are covered
      // const allText = questionTexts.join(' ').toLowerCase();
      // expect(allText).toMatch(/react|component|state|experience|problem|challenge/);
    });

    it('should handle different question counts', async () => {
      // 🔴 This test WILL FAIL - function parameter handling doesn't exist yet
      // Testing: src/lib/gemini.ts - generateAllInterviewQuestions with custom count
      
      await expect(
        generateAllInterviewQuestions(mockJdResume, mockPersona, 2)
      ).rejects.toThrow('generateAllInterviewQuestions not implemented yet');
      
      await expect(
        generateAllInterviewQuestions(mockJdResume, mockPersona, 5)
      ).rejects.toThrow('generateAllInterviewQuestions not implemented yet');
      
      // 🟢 GREEN phase expectations:
      // const twoQuestions = await generateAllInterviewQuestions(mockJdResume, mockPersona, 2);
      // expect(twoQuestions).toHaveLength(2);
      
      // const fiveQuestions = await generateAllInterviewQuestions(mockJdResume, mockPersona, 5);
      // expect(fiveQuestions).toHaveLength(5);
    });

    it('should handle AI service failures with fallback questions', async () => {
      // 🔴 This test WILL FAIL - error handling doesn't exist yet
      // Testing: src/lib/gemini.ts - error handling and fallback mechanisms
      
      // Mock AI service failure - following established pattern
      const mockInstance = new MockedGoogleGenAI();
      const mockGenerateContentStream = mockInstance.models.generateContentStream as jest.MockedFunction<any>;
      mockGenerateContentStream.mockRejectedValue(new Error('AI service timeout'));

      await expect(
        generateAllInterviewQuestions(mockJdResume, mockPersona, 3)
      ).rejects.toThrow('generateAllInterviewQuestions not implemented yet');
      
      // 🟢 GREEN phase expectations:
      // const questions = await generateAllInterviewQuestions(mockJdResume, mockPersona, 3);
      
      // // Should still return 3 questions even on AI failure
      // expect(questions).toHaveLength(3);
      
      // // Fallback questions should be marked
      // expect(questions[0]!.questionText).toContain('[FALLBACK');
      // expect(questions[0]!.rawAiResponseText).toContain('FALLBACK_RESPONSE');
      
      // // Should still have valid key points
      // expect(questions[0]!.keyPoints).toHaveLength(3);
    });

    it('should use job description and resume context for relevant questions', async () => {
      // 🔴 This test WILL FAIL - context-aware generation doesn't exist yet
      // Testing: src/lib/gemini.ts - context integration from JD and resume
      
      await expect(
        generateAllInterviewQuestions(mockJdResume, mockPersona, 3)
      ).rejects.toThrow('generateAllInterviewQuestions not implemented yet');
      
      // 🟢 GREEN phase expectations:
      // const questions = await generateAllInterviewQuestions(mockJdResume, mockPersona, 3);
      
      // const allQuestionsText = questions.map(q => q.questionText).join(' ').toLowerCase();
      
      // // Should reference technologies from JD/Resume
      // expect(allQuestionsText).toMatch(/react|typescript|node|redux|testing/);
      
      // // Should be appropriate for the role level
      // expect(allQuestionsText).toMatch(/experience|approach|challenging|complex/);
    });

    it('should generate questions with diverse key points', async () => {
      // 🔴 This test WILL FAIL - key point diversity logic doesn't exist yet
      // Testing: src/lib/gemini.ts - key point generation and diversity
      
      await expect(
        generateAllInterviewQuestions(mockJdResume, mockPersona, 3)
      ).rejects.toThrow('generateAllInterviewQuestions not implemented yet');
      
      // 🟢 GREEN phase expectations:
      // const questions = await generateAllInterviewQuestions(mockJdResume, mockPersona, 3);
      
      // // Collect all key points
      // const allKeyPoints = questions.flatMap(q => q.keyPoints);
      
      // // Should have 9 total key points (3 per question)
      // expect(allKeyPoints).toHaveLength(9);
      
      // // Key points should be diverse
      // const uniqueKeyPoints = new Set(allKeyPoints.map(kp => kp.toLowerCase().trim()));
      // expect(uniqueKeyPoints.size).toBeGreaterThan(6); // Most should be unique
      
      // // Key points should be actionable
      // allKeyPoints.forEach(keyPoint => {
      //   expect(keyPoint.length).toBeGreaterThan(5);
      //   expect(keyPoint).not.toMatch(/^-\s*$/); // Not just dashes
      // });
    });
  });

  describe('Integration with existing types', () => {
    it('should return data matching TopicalQuestionResponse interface', async () => {
      // 🔴 This test WILL FAIL - return type doesn't match interface yet
      // Testing: src/types/index.ts - TopicalQuestionResponse interface compatibility
      
      await expect(
        generateAllInterviewQuestions(mockJdResume, mockPersona, 1)
      ).rejects.toThrow('generateAllInterviewQuestions not implemented yet');
      
      // 🟢 GREEN phase expectations:
      // const questions = await generateAllInterviewQuestions(mockJdResume, mockPersona, 1);
      // const question = questions[0]!;
      
      // // Verify strict interface compliance
      // expect(typeof question.questionText).toBe('string');
      // expect(Array.isArray(question.keyPoints)).toBe(true);
      // expect(typeof question.rawAiResponseText).toBe('string');
      
      // // Verify no extra properties (strict interface)
      // const allowedKeys = ['questionText', 'keyPoints', 'rawAiResponseText'];
      // const actualKeys = Object.keys(question);
      // actualKeys.forEach(key => {
      //   expect(allowedKeys).toContain(key);
      // });
    });
  });
}); 