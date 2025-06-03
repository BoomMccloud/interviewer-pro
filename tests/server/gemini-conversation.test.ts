import { continueConversation } from '~/lib/gemini';
import type { JdResumeText, Persona, MvpSessionTurn } from '~/types';

// Simple mocking approach that works with Jest hoisting
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContentStream: jest.fn(),
    },
  })),
  HarmCategory: {},
  HarmBlockThreshold: {},
}));

// Import the mocked GoogleGenAI after the mock is set up
import { GoogleGenAI } from '@google/genai';
const MockedGoogleGenAI = GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>;

describe('continueConversation - Purely Conversational AI Function', () => {
  const mockJdResumeText: JdResumeText = {
    id: 'test-jd-resume-id',
    jdText: 'Senior React Developer position requiring 5+ years experience with TypeScript, React, Node.js',
    resumeText: 'Software Engineer with 6 years experience in React, TypeScript, and full-stack development',
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPersona: Persona = {
    id: 'technical-interviewer',
    name: 'Technical Interviewer',
    systemPrompt: 'You are a senior technical interviewer focusing on React and TypeScript skills.',
  };

  const mockHistory: MvpSessionTurn[] = [
    {
      id: 'mock-turn-1',
      role: 'model',
      text: 'Tell me about your React experience and how you\'ve used TypeScript in your projects.',
      timestamp: new Date(),
      rawAiResponseText: '<QUESTION>Tell me about your React experience...</QUESTION><KEY_POINTS>- Discuss specific projects\n- Mention TypeScript usage\n- Highlight challenges overcome</KEY_POINTS>',
    },
    {
      id: 'mock-turn-2',
      role: 'user', 
      text: 'I have been working with React for 6 years, starting with class components and transitioning to hooks. I\'ve used TypeScript extensively for type safety and better developer experience.',
      timestamp: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup successful mock response by default
    const mockAsyncIterable = {
      [Symbol.asyncIterator]: async function* () {
        yield { text: '<ANALYSIS>Great background with React and TypeScript. Shows good progression from class components to modern hooks pattern.</ANALYSIS>' };
        yield { text: '<FEEDBACK>\n- Shows progression from class to hooks\n- Good use of TypeScript for safety\n- Demonstrates experience growth</FEEDBACK>' };
        yield { text: '<FOLLOW_UP>Can you describe a specific React hook you found particularly useful in your projects?</FOLLOW_UP>' };
      },
    };
    
    // Mock the generateContentStream method
    const mockInstance = new MockedGoogleGenAI();
    const mockGenerateContentStream = mockInstance.models.generateContentStream as jest.MockedFunction<any>;
    mockGenerateContentStream.mockResolvedValue(mockAsyncIterable);
  });

  describe('🟢 GREEN Phase - Function Interface & Behavior', () => {
    it('should exist as an exported function', () => {
      expect(continueConversation).toBeDefined();
      expect(typeof continueConversation).toBe('function');
    });

    it('should accept correct parameters and return ConversationalResponse', async () => {
      const userResponse = 'I particularly enjoy using React hooks for state management and side effects.';

      const result = await continueConversation(
        mockJdResumeText,
        mockPersona, 
        mockHistory,
        userResponse
      );

      // Expected return type for conversational responses
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('feedbackPoints');
      expect(result).toHaveProperty('followUpQuestion');
      expect(result).toHaveProperty('rawAiResponseText');
      
      // Should NOT have nextQuestion or keyPoints (those are for topic transitions)
      expect(result).not.toHaveProperty('nextQuestion');
      expect(result).not.toHaveProperty('keyPoints');
    });

    it('should generate follow-up question about the SAME topic (React)', async () => {
      const userResponse = 'I have been using React hooks extensively, especially useState and useEffect.';
      
      const result = await continueConversation(
        mockJdResumeText,
        mockPersona,
        mockHistory, 
        userResponse
      );

      // Follow-up should be about React, not a new topic
      expect(result.followUpQuestion).toContain('React');
      expect(result.followUpQuestion).not.toContain('leadership'); // Different topic
      expect(result.followUpQuestion).not.toContain('design patterns'); // Different topic
    });

    it('should provide meaningful analysis of user response', async () => {
      const userResponse = 'I love using useEffect for API calls and data fetching.';
      
      const result = await continueConversation(
        mockJdResumeText,
        mockPersona,
        mockHistory,
        userResponse
      );

      expect(result.analysis).toBeDefined();
      expect(result.analysis.length).toBeGreaterThan(10);
      expect(result.analysis).not.toBe('N/A');
      expect(result.analysis).not.toBe('No analysis provided for this answer.');
    });

    it('should provide specific feedback points', async () => {
      const userResponse = 'I use React hooks like useState and useEffect in all my components.';
      
      const result = await continueConversation(
        mockJdResumeText,
        mockPersona,
        mockHistory,
        userResponse
      );

      expect(Array.isArray(result.feedbackPoints)).toBe(true);
      expect(result.feedbackPoints.length).toBeGreaterThan(0);
      expect(result.feedbackPoints[0]).not.toBe('No specific feedback provided.');
    });
  });

  describe('🔵 REFACTOR Phase - AI Prompt Constraints', () => {
    it('should use conversational-only AI prompt that prohibits topic transitions', async () => {
      const userResponse = 'I have experience with React, but I also manage teams.';
      
      const result = await continueConversation(
        mockJdResumeText,
        mockPersona,
        mockHistory,
        userResponse
      );

      // Even when user mentions team management, should stay on React topic
      expect(result.followUpQuestion).toContain('React');
      expect(result.followUpQuestion).not.toContain('team management');
      expect(result.followUpQuestion).not.toContain('leadership');
    });

    it('should dig deeper into current topic rather than exploring new areas', async () => {
      const userResponse = 'I use React hooks for state management.';
      
      const result = await continueConversation(
        mockJdResumeText,
        mockPersona,
        mockHistory,
        userResponse
      );

      // Should ask about specifics of React hooks, not switch topics
      const followUp = result.followUpQuestion.toLowerCase();
      expect(
        followUp.includes('hook') || 
        followUp.includes('state') || 
        followUp.includes('react') ||
        followUp.includes('component')
      ).toBe(true);
    });
  });

  describe('🔵 REFACTOR Phase - Error Handling', () => {
    it('should handle AI API errors gracefully', async () => {
      // Mock AI failure
      const mockInstance = new MockedGoogleGenAI();
      const mockGenerateContentStream = mockInstance.models.generateContentStream as jest.MockedFunction<any>;
      mockGenerateContentStream.mockRejectedValue(new Error('AI service unavailable'));

      const userResponse = 'Test response';

      await expect(
        continueConversation(mockJdResumeText, mockPersona, mockHistory, userResponse)
      ).rejects.toThrow('Failed to continue conversation');
    });

    it('should handle empty user responses', async () => {
      const userResponse = '';
      
      await expect(
        continueConversation(mockJdResumeText, mockPersona, mockHistory, userResponse)
      ).rejects.toThrow('User response cannot be empty');
    });

    it('should handle malformed AI responses gracefully', async () => {
      // Mock malformed AI response
      const malformedResponse = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: 'Invalid response without proper XML tags' };
        },
      };
      
      const mockInstance = new MockedGoogleGenAI();
      const mockGenerateContentStream = mockInstance.models.generateContentStream as jest.MockedFunction<any>;
      mockGenerateContentStream.mockResolvedValue(malformedResponse);

      const userResponse = 'Test response';
      const result = await continueConversation(mockJdResumeText, mockPersona, mockHistory, userResponse);

      // Should still return a valid response with fallbacks
      expect(result.analysis).toBeDefined();
      expect(result.followUpQuestion).toBeDefined();
      expect(Array.isArray(result.feedbackPoints)).toBe(true);
    });
  });
}); 