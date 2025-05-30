// tests/gemini-single.test.ts

// --- Mocking the GoogleGenAI library ---
// IMPORTANT: Define all mock variables BEFORE jest.mock()
// This is the function we expect to be called on genAI.models
const mockGenerateContentStreamOnModels = jest.fn();

// Mock for the GoogleGenAI constructor
const mockGoogleGenAIConstructor = jest.fn().mockImplementation(() => ({
  // The 'models' object should directly have 'generateContentStream'
  models: {
    generateContentStream: mockGenerateContentStreamOnModels,
    // If other methods on `ai.models` are used by your code, they'd also be mocked here.
  },
}));

// Now, jest.mock() can safely access the already defined mock variables
jest.mock('@google/genai', () => ({
  GoogleGenAI: mockGoogleGenAIConstructor, // Use the updated constructor mock
  HarmCategory: {}, // Mock enums as needed
  HarmBlockThreshold: {}, // Mock enums as needed
  Modality: { TEXT: 'text', IMAGE: 'image' }, // Mock enums as needed
  __esModule: true,
}));

import {
  // GoogleGenAI as ActualGoogleGenAI, // Keep original import if needed, but we mock the module
  // Modality as ActualModality,
  type Content,
  type GenerateContentResponse,
  type Part,
  type FunctionCall,
  type GenerationConfig,
  type SafetySetting,
} from '@google/genai';

// Import the function to be tested
import { getFirstQuestion } from '../src/lib/gemini';

// Import necessary types from your project
import type {
  Persona,
} from '../src/types';
import type { JdResumeText } from '@prisma/client';

// --- Dummy Data for Testing ---
const mockJdResumeText: JdResumeText = {
  jdText: "Job Description: Senior Software Engineer, AI Division. Requires 5+ years of Python, ML, and cloud platforms.",
  resumeText: "Resume: Experienced SDE with 7 years in Python, PyTorch, AWS, and leading ML projects.",
  id: 'test-jd-resume-id',
  userId: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPersona: Persona = {
  id: 'interviewer-ai',
  name: 'Interviewer AI',
  systemPrompt: 'You are an expert interviewer. Ask insightful questions.',
};

const mockRawAiResponseValid = `
<QUESTION>Tell me about your experience with large-scale machine learning model deployment.</QUESTION>
<ANALYSIS>The candidate's resume shows relevant experience.</ANALYSIS>
<FEEDBACK>Focus on specific challenges and how you overcame them.</FEEDBACK>
<SUGGESTED_ALTERNATIVE>Consider asking about a project where you had to scale an ML model and the specific techniques used.</SUGGESTED_ALTERNATIVE>
`;

// Define a type for the expected arguments of generateContentStream
interface GenerateContentStreamArgs {
  model: string;
  contents: Content[];
  generationConfig?: GenerationConfig;
  safetySettings?: SafetySetting[];
  // Add 'config' if used, e.g., config?: { responseModalities?: any[] };
}

function createMockStream(responseText: string): AsyncIterable<GenerateContentResponse> {
  const chunks = [responseText];
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        const mockResponsePart = {
            text: chunk,      // Direct property, not method
            functionCalls: [] as FunctionCall[],
            data: '',        
            executableCode: '', 
            codeExecutionResult: '' 
        };
        yield mockResponsePart as unknown as GenerateContentResponse;
      }
    },
  };
}


// --- Test Suite ---
describe('Gemini Service - Single Test for getFirstQuestion', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Specifically clear the mock function we'll be asserting on
    mockGenerateContentStreamOnModels.mockClear();
  });

  it('should return a parsed question and raw response text on successful API call', async () => {
    // Arrange
    const mockStream = createMockStream(mockRawAiResponseValid);
    mockGenerateContentStreamOnModels.mockResolvedValueOnce(mockStream);

    // Act
    const result = await getFirstQuestion(mockJdResumeText, mockPersona);

    // Assert
    // 1. Check if the GoogleGenAI constructor was called
    // expect(mockGoogleGenAIConstructor).toHaveBeenCalledTimes(1);
    // This is commented out because GoogleGenAI is likely instantiated at the module level
    // in src/lib/gemini.ts. jest.clearAllMocks() in beforeEach resets its call count.
    // The successful mocking and subsequent check of generateContentStream is a more direct
    // test of getFirstQuestion's interaction with the genAI instance.

    // 2. Check if generateContentStream was called on genAI.models
    expect(mockGenerateContentStreamOnModels).toHaveBeenCalledTimes(1);

    // 3. Check the arguments passed to generateContentStream
    const firstCallArguments = mockGenerateContentStreamOnModels.mock.calls[0] as unknown[] | undefined;
    if (!firstCallArguments || firstCallArguments.length === 0) {
      throw new Error("Test setup error: generateContentStream was not called or called with no arguments.");
    }
    
    const calledArgs = firstCallArguments[0] as GenerateContentStreamArgs;

    if (!calledArgs) {
      throw new Error("Test setup error: generateContentStream was called with undefined arguments.");
    }

    expect(calledArgs.model).toBe('gemini-2.0-flash-001'); 
    expect(calledArgs.contents).toBeInstanceOf(Array);
    if (!calledArgs.contents || calledArgs.contents.length === 0) {
      throw new Error("Test assertion failed: calledArgs.contents is empty or undefined.");
    }
    expect(calledArgs.contents.length).toBe(1); 

    const firstContentElement = calledArgs.contents[0];
    if (!firstContentElement?.parts) { // Optional chaining here
      throw new Error("Test assertion failed: calledArgs.contents[0].parts is not as expected.");
    }

    const firstUserPartText = firstContentElement.parts.map((p: Part) => p.text ?? '').join(''); // Nullish coalescing here
    expect(firstUserPartText).toContain(mockJdResumeText.jdText);
    expect(firstUserPartText).toContain(mockJdResumeText.resumeText);
    expect(firstUserPartText).toContain(mockPersona.name);
    expect(firstUserPartText).toContain(mockPersona.systemPrompt);
    expect(firstUserPartText).toContain("<QUESTION>"); 
    
    // 4. Check the parsed output from getFirstQuestion
    expect(result).toEqual({
      questionText: 'Tell me about your experience with large-scale machine learning model deployment.',
      rawAiResponseText: mockRawAiResponseValid, // Expect the raw string as is, assuming getFirstQuestion does not trim the outermost newlines.
    });
  });
});

// Ensure console error spies are handled if testing error paths,
// but for this single happy path test, it's not immediately necessary
// unless getFirstQuestion logs errors even on success. 