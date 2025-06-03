import { getNewTopicalQuestion } from '~/lib/gemini';
import type { JdResumeText, Persona, MvpSessionTurn } from '~/types';

// Clean mock approach - avoid TypeScript issues
const mockGenerateContentStream = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContentStream: mockGenerateContentStream,
    },
  })),
  HarmCategory: {},
  HarmBlockThreshold: {},
}));

describe('getNewTopicalQuestion - Topic Transition AI Function', () => {
  const mockJdResumeText: JdResumeText = {
    id: 'test-jd-resume-id',
    jdText: 'Senior React Developer position requiring experience with React, TypeScript, Node.js, team leadership, and system design',
    resumeText: 'Software Engineer with 6 years experience in React, TypeScript, full-stack development, and leading small teams',
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPersona: Persona = {
    id: 'technical-interviewer',
    name: 'Technical Interviewer', 
    systemPrompt: 'You are a senior technical interviewer conducting comprehensive interviews.',
  };

  const mockHistoryAfterReactDiscussion: MvpSessionTurn[] = [
    {
      id: 'mock-turn-1',
      role: 'model',
      text: 'Tell me about your React experience and TypeScript usage.',
      timestamp: new Date(),
      type: 'topic_transition',
      rawAiResponseText: '<QUESTION>Tell me about your React experience...</QUESTION><KEY_POINTS>- React projects\n- TypeScript integration\n- Challenges faced</KEY_POINTS>',
    },
    {
      id: 'mock-turn-2',
      role: 'user',
      text: 'I have 6 years React experience, used TypeScript extensively for type safety.',
      timestamp: new Date(),
    },
    {
      id: 'mock-turn-3',
      role: 'model', 
      text: 'Great background! Can you describe a specific challenging React project you worked on?',
      timestamp: new Date(),
      type: 'conversational',
    },
    {
      id: 'mock-turn-4',
      role: 'user',
      text: 'I built a complex dashboard with real-time data visualization using React hooks and Context API.',
      timestamp: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup successful mock response for topical questions
    const mockAsyncIterable = {
      [Symbol.asyncIterator]: async function* () {
        yield { text: '<QUESTION>Tell me about your experience leading development teams and mentoring junior developers.</QUESTION>' };
        yield { text: '<KEY_POINTS>\n- Team leadership experience\n- Mentoring and coaching skills\n- Project management responsibilities</KEY_POINTS>' };
      },
    };
    
    // Type assertion to fix TypeScript issues
    (mockGenerateContentStream as jest.MockedFunction<typeof mockGenerateContentStream>)
      .mockResolvedValue(mockAsyncIterable);
  });

  describe('🟢 GREEN Phase - Function Interface & Behavior', () => {
    it('should exist as an exported function', () => {
      expect(getNewTopicalQuestion).toBeDefined();
      expect(typeof getNewTopicalQuestion).toBe('function');
    });

    it('should accept correct parameters and return TopicalQuestionResponse', async () => {
      const result = await getNewTopicalQuestion(
        mockJdResumeText,
        mockPersona,
        mockHistoryAfterReactDiscussion,
        ['React', 'TypeScript'] // covered topics
      );

      // Expected return type for topical questions
      expect(result).toHaveProperty('questionText');
      expect(result).toHaveProperty('keyPoints');
      expect(result).toHaveProperty('rawAiResponseText');
      
      // Should NOT have conversational properties
      expect(result).not.toHaveProperty('analysis');
      expect(result).not.toHaveProperty('feedbackPoints');
      expect(result).not.toHaveProperty('followUpQuestion');
    });

    it('should generate NEW topic different from covered topics', async () => {
      const coveredTopics = ['React', 'TypeScript'];
      
      const result = await getNewTopicalQuestion(
        mockJdResumeText,
        mockPersona,
        mockHistoryAfterReactDiscussion,
        coveredTopics
      );

      // Should ask about a different topic (leadership, Node.js, system design)
      const questionLower = result.questionText.toLowerCase();
      expect(
        questionLower.includes('leadership') ||
        questionLower.includes('team') ||
        questionLower.includes('node') ||
        questionLower.includes('system') ||
        questionLower.includes('design')
      ).toBe(true);

      // Should NOT repeat covered topics
      expect(questionLower).not.toContain('react experience');
      expect(questionLower).not.toContain('typescript');
    });

    it('should provide relevant key points for new topic', async () => {
      const result = await getNewTopicalQuestion(
        mockJdResumeText,
        mockPersona,
        mockHistoryAfterReactDiscussion,
        ['React', 'TypeScript']
      );

      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(result.keyPoints.length).toBeGreaterThanOrEqual(3);
      expect(result.keyPoints.length).toBeLessThanOrEqual(4);
      
      // Key points should be meaningful, not fallbacks
      expect(result.keyPoints[0]).not.toBe('Focus on your specific role');
      expect(result.keyPoints).not.toContain('Highlight technologies used');
    });
  });

  describe('🔵 REFACTOR Phase - Topic Intelligence', () => {
    it('should avoid topics already covered in conversation history', async () => {
      const result = await getNewTopicalQuestion(
        mockJdResumeText,
        mockPersona,
        mockHistoryAfterReactDiscussion,
        ['React', 'TypeScript', 'frontend development']
      );

      const questionText = result.questionText.toLowerCase();
      
      // Should move to backend or leadership topics
      expect(
        questionText.includes('node') ||
        questionText.includes('backend') ||
        questionText.includes('leadership') ||
        questionText.includes('team') ||
        questionText.includes('system design')
      ).toBe(true);
    });

    it('should focus on job description requirements not yet explored', async () => {
      // JD mentions: React, TypeScript, Node.js, team leadership, system design
      // Already covered: React, TypeScript
      const result = await getNewTopicalQuestion(
        mockJdResumeText,
        mockPersona,
        mockHistoryAfterReactDiscussion,
        ['React', 'TypeScript']
      );

      const questionText = result.questionText.toLowerCase();
      const keyPointsText = result.keyPoints.join(' ').toLowerCase();
      
      // Should focus on remaining JD requirements
      expect(
        questionText.includes('node') ||
        questionText.includes('leadership') ||
        questionText.includes('team') ||
        questionText.includes('system') ||
        keyPointsText.includes('node') ||
        keyPointsText.includes('leadership') ||
        keyPointsText.includes('team')
      ).toBe(true);
    });

    it('should generate different questions when called multiple times', async () => {
      // Setup different mock responses for multiple calls
      (mockGenerateContentStream as jest.MockedFunction<typeof mockGenerateContentStream>)
        .mockResolvedValueOnce({
          [Symbol.asyncIterator]: async function* () {
            yield { text: '<QUESTION>Tell me about your Node.js backend development experience.</QUESTION>' };
            yield { text: '<KEY_POINTS>\n- Server architecture\n- API design\n- Database integration</KEY_POINTS>' };
          },
        })
        .mockResolvedValueOnce({
          [Symbol.asyncIterator]: async function* () {
            yield { text: '<QUESTION>Describe your experience with team leadership and project management.</QUESTION>' };
            yield { text: '<KEY_POINTS>\n- Team leadership\n- Project planning\n- Mentoring experience</KEY_POINTS>' };
          },
        });

      const firstResult = await getNewTopicalQuestion(
        mockJdResumeText,
        mockPersona,
        mockHistoryAfterReactDiscussion,
        ['React']
      );

      const secondResult = await getNewTopicalQuestion(
        mockJdResumeText,
        mockPersona,
        mockHistoryAfterReactDiscussion,
        ['React', 'TypeScript']
      );

      // Different covered topics should lead to different questions
      expect(firstResult.questionText).not.toBe(secondResult.questionText);
    });

    it('should handle no covered topics by generating first technical question', async () => {
      const result = await getNewTopicalQuestion(
        mockJdResumeText,
        mockPersona,
        [],
        [] // no covered topics
      );

      // Should generate a question based on JD requirements
      expect(result.questionText).toBeDefined();
      expect(result.questionText.length).toBeGreaterThan(10);
      expect(result.keyPoints.length).toBeGreaterThan(0);
    });
  });

  describe('🔵 REFACTOR Phase - Error Handling', () => {
    it('should handle AI API errors gracefully', async () => {
      // Mock AI failure
      (mockGenerateContentStream as jest.MockedFunction<typeof mockGenerateContentStream>)
        .mockRejectedValue(new Error('AI service unavailable'));

      await expect(
        getNewTopicalQuestion(mockJdResumeText, mockPersona, mockHistoryAfterReactDiscussion, ['React'])
      ).rejects.toThrow('Failed to generate new topical question');
    });

    it('should handle empty history gracefully', async () => {
      const result = await getNewTopicalQuestion(
        mockJdResumeText,
        mockPersona,
        [], // empty history
        []  // no covered topics
      );

      // Should still generate a question based on JD/Resume
      expect(result.questionText).toBeDefined();
      expect(result.questionText.length).toBeGreaterThan(10);
    });

    it('should handle malformed AI responses gracefully', async () => {
      // Mock malformed AI response
      const malformedResponse = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: 'Invalid response without proper XML tags' };
        },
      };
      
      (mockGenerateContentStream as jest.MockedFunction<typeof mockGenerateContentStream>)
        .mockResolvedValue(malformedResponse);

      const result = await getNewTopicalQuestion(
        mockJdResumeText,
        mockPersona,
        mockHistoryAfterReactDiscussion,
        ['React', 'TypeScript']
      );

      // Should still return a valid response with fallbacks
      expect(result.questionText).toBeDefined();
      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(result.keyPoints.length).toBeGreaterThan(0);
    });

    it('should handle undefined covered topics parameter', async () => {
      const result = await getNewTopicalQuestion(
        mockJdResumeText,
        mockPersona,
        mockHistoryAfterReactDiscussion
        // No coveredTopics parameter
      );

      // Should still work without covered topics
      expect(result.questionText).toBeDefined();
      expect(result.keyPoints.length).toBeGreaterThan(0);
    });
  });
}); 