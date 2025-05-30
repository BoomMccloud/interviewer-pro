// tests/gemini-continueInterview.test.ts

// --- Mocking the GoogleGenAI library ---
const mockGenerateContentStreamOnModels = jest.fn();

const mockGoogleGenAIConstructor = jest.fn().mockImplementation(() => ({
  models: {
    generateContentStream: mockGenerateContentStreamOnModels,
  },
}));

jest.mock('@google/genai', () => ({
  GoogleGenAI: mockGoogleGenAIConstructor,
  HarmCategory: {},
  HarmBlockThreshold: {},
  Modality: { TEXT: 'text', IMAGE: 'image' }, // Mock Modality if used by gemini.ts
  __esModule: true,
}));

import {
  type Content,
  type GenerateContentResponse,
  type Part,
  type FunctionCall,
  type GenerationConfig,
  type SafetySetting,
} from '@google/genai';

// Import the function to be tested
import { continueInterview } from '../src/lib/gemini';

// Import necessary types from your project
import type {
  Persona,
  MvpSessionTurn,
  MvpAiResponse,
} from '../src/types';
import type { JdResumeText } from '@prisma/client';

// --- Dummy Data for Testing ---
const mockJdResumeText: JdResumeText = {
  jdText: "Job Description: Software Engineer, Backend Systems. Proficient in Node.js and microservices.",
  resumeText: "Resume: SWE with 3 years in Node.js, Express, Docker, and building scalable APIs.",
  id: 'test-jd-resume-id-2',
  userId: 'test-user-id-2',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPersona: Persona = {
  id: 'hiring-manager-generic',
  name: 'Hiring Manager',
  systemPrompt: 'You are a hiring manager looking for a good team fit. Assess both technical and soft skills.',
};

const mockHistory: MvpSessionTurn[] = [
  {
    id: 'turn-1',
    role: 'model', // AI's first question
    text: 'Could you describe a challenging project you worked on?', // This is the question part of the raw text
    rawAiResponseText: '<QUESTION>Could you describe a challenging project you worked on?</QUESTION><ANALYSIS>Initial question.</ANALYSIS><FEEDBACK>N/A</FEEDBACK><SUGGESTED_ALTERNATIVE>N/A</SUGGESTED_ALTERNATIVE>',
    timestamp: new Date(Date.now() - 10000), // 10 seconds ago
  },
  {
    id: 'turn-2',
    role: 'user',
    text: "Yes, I worked on a project to refactor a monolithic service into microservices. It was challenging due to coordinating deployments.",
    timestamp: new Date(Date.now() - 5000), // 5 seconds ago
  },
];

const mockCurrentUserResponse = "The main challenge was ensuring data consistency across the new microservices during the transition phase.";

const mockAiResponseForContinue = `
<QUESTION>How did you ensure data consistency during the microservices refactor?</QUESTION>
<ANALYSIS>The candidate identified a relevant challenge (data consistency) from their previous answer.</ANALYSIS>
<FEEDBACK>
- Good job specifying a particular challenge.
- Could elaborate more on the specific strategies used.
</FEEDBACK>
<SUGGESTED_ALTERNATIVE>When discussing data consistency, I might mention specific patterns like the SAGA pattern or two-phase commit, and how we evaluated and implemented them.</SUGGESTED_ALTERNATIVE>
`;

// Expected parsed output from the mockAiResponseForContinue
const expectedParsedResponse: MvpAiResponse = {
  nextQuestion: 'How did you ensure data consistency during the microservices refactor?',
  analysis: "The candidate identified a relevant challenge (data consistency) from their previous answer.",
  feedbackPoints: [
    '- Good job specifying a particular challenge.',
    '- Could elaborate more on the specific strategies used.',
  ],
  suggestedAlternative: 'When discussing data consistency, I might mention specific patterns like the SAGA pattern or two-phase commit, and how we evaluated and implemented them.',
};


// Define a type for the expected arguments of generateContentStream
interface GenerateContentStreamArgs {
  model: string;
  contents: Content[];
  generationConfig?: GenerationConfig;
  safetySettings?: SafetySetting[];
  config?: { responseModalities?: string[] }; // Added based on gemini.ts usage
}

function createMockStream(responseText: string): AsyncIterable<GenerateContentResponse> {
  // Helper function to simulate the stream
  return {
    async *[Symbol.asyncIterator]() {
      // For simplicity, yield the whole response as one chunk.
      // More complex tests could simulate multiple chunks.
      const mockResponsePart = {
            text: responseText, // Direct property, not method
            // Ensure other properties expected by processStream are present or mocked if accessed
        };
      yield mockResponsePart as unknown as GenerateContentResponse;
    },
  };
}


// --- Test Suite ---
describe('Gemini Service - continueInterview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateContentStreamOnModels.mockClear();
  });

  it('should correctly process history, user response, and return parsed AI turn', async () => {
    // Arrange
    const mockStream = createMockStream(mockAiResponseForContinue);
    mockGenerateContentStreamOnModels.mockResolvedValueOnce(mockStream);

    // Act
    const result = await continueInterview(
      mockJdResumeText,
      mockPersona,
      mockHistory,
      mockCurrentUserResponse
    );

    // Assert
    // 1. Check if generateContentStream was called on genAI.models
    expect(mockGenerateContentStreamOnModels).toHaveBeenCalledTimes(1);

    // 2. Check the arguments passed to generateContentStream
    const firstCallArguments = mockGenerateContentStreamOnModels.mock.calls[0] as unknown[] | undefined;
    if (!firstCallArguments || firstCallArguments.length === 0) {
      throw new Error("Test setup error: generateContentStream was not called or called with no arguments.");
    }
    
    const calledArgs = firstCallArguments[0] as GenerateContentStreamArgs;

    if (!calledArgs) {
      throw new Error("Test setup error: generateContentStream was called with undefined arguments.");
    }

    expect(calledArgs.model).toBe('gemini-2.0-flash-001'); // Updated to match MODEL_NAME_TEXT in gemini.ts
    // Note: Our implementation uses config: { temperature, maxOutputTokens }, not responseModalities

    // Validate the structure and content of `calledArgs.contents`
    expect(calledArgs.contents).toBeInstanceOf(Array);
    // Expected contents:
    // 1. Initial user prompt (system instructions, JD, Resume, response format instructions)
    // 2. History turn 1 (model)
    // 3. History turn 2 (user)
    // 4. Current user response
    expect(calledArgs.contents.length).toBe(1 + mockHistory.length + 1);


    // Detailed check of contents:
    // First element: System prompt, JD/Resume, AI response format
    const initialPromptContent = calledArgs.contents[0];
    if (!initialPromptContent?.parts) throw new Error("Test assertion failed: initialPromptContent or its parts are undefined.");
    expect(initialPromptContent.role).toBe('user'); // As per buildPromptContents structure
    const initialPartsText = initialPromptContent.parts.map((p: Part) => p.text ?? '').join('');
    expect(initialPartsText).toContain(mockPersona.name);
    expect(initialPartsText).toContain(mockPersona.systemPrompt);
    expect(initialPartsText).toContain(mockJdResumeText.jdText);
    expect(initialPartsText).toContain(mockJdResumeText.resumeText);
    expect(initialPartsText).toContain("<QUESTION>Your interview question here?</QUESTION>"); // Instruction text

    // Second element: First history turn (model)
    const historyTurn1Content = calledArgs.contents[1];
    if (!historyTurn1Content?.parts?.[0]) throw new Error("Test assertion failed: historyTurn1Content or its parts are undefined.");
    expect(historyTurn1Content.role).toBe('model');
    expect(historyTurn1Content.parts[0].text).toBe(mockHistory[0]?.rawAiResponseText);

    // Third element: Second history turn (user)
    const historyTurn2Content = calledArgs.contents[2];
    if (!historyTurn2Content?.parts?.[0]) throw new Error("Test assertion failed: historyTurn2Content or its parts are undefined.");
    expect(historyTurn2Content.role).toBe('user');
    expect(historyTurn2Content.parts[0].text).toBe(mockHistory[1]?.text);
    
    // Fourth element: Current user response
    const currentUserResponseContent = calledArgs.contents[3];
    if (!currentUserResponseContent?.parts?.[0]) throw new Error("Test assertion failed: currentUserResponseContent or its parts are undefined.");
    expect(currentUserResponseContent.role).toBe('user');
    expect(currentUserResponseContent.parts[0].text).toBe(mockCurrentUserResponse);

    // 3. Check the parsed output from continueInterview
    expect(result).toEqual({
      ...expectedParsedResponse,
      rawAiResponseText: mockAiResponseForContinue,
    });
  });

  it('should throw an error if Gemini API returns an empty response', async () => {
    // Arrange
    const mockEmptyStream = createMockStream(''); // Simulate empty response
    mockGenerateContentStreamOnModels.mockResolvedValueOnce(mockEmptyStream);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { /* no-op */ }); // Suppress console.error

    // Act & Assert
    await expect(
      continueInterview(mockJdResumeText, mockPersona, mockHistory, mockCurrentUserResponse)
    ).rejects.toThrow('Failed to get next question and feedback from AI.'); // Updated to expect the generic error

    // Verify that the more specific error was logged internally
    expect(consoleErrorSpy).toHaveBeenCalledWith("Gemini returned empty response for continue interview.");
    // Optionally, verify the second console.error from the catch block
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error continuing interview with Gemini:", expect.objectContaining({ message: 'Gemini returned an empty response.'}));
    consoleErrorSpy.mockRestore();
  });
  
  it('should throw an error if Gemini API call fails', async () => {
    // Arrange
    const errorMessage = 'Network error';
    mockGenerateContentStreamOnModels.mockRejectedValueOnce(new Error(errorMessage));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { /* no-op */ }); // Suppress console.error

    // Act & Assert
    await expect(
      continueInterview(mockJdResumeText, mockPersona, mockHistory, mockCurrentUserResponse)
    ).rejects.toThrow('Failed to get next question and feedback from AI.');

    expect(consoleErrorSpy).toHaveBeenCalledWith("Error continuing interview with Gemini:", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
}); 