// lib/gemini.ts

// Import necessary Google GenAI library
// Based on your example: import {GoogleGenAI, Modality} from '@google/genai';
import {
  GoogleGenAI,
  // Modality, // Although only text used in MVP, keep import for consistency
  // HarmCategory,
  // HarmBlockThreshold,
} from '@google/genai'; // Assuming this is the correct package name
import type {
  Content, // For request payload
  Part, // For request payload parts
  GenerateContentResponse, // For processStream
} from '@google/genai';

// Import types defined in your project
import type {
  JdResumeText, // Corrected MvpJdResumeText to JdResumeText
  Persona, // Type for Persona definition (at least { id: string; name: string; systemPrompt: string; })
  MvpAiResponse, // Type for the structured AI response
  MvpSessionTurn, // Type for storing a single turn in session history ({ role: 'user' | 'model', text: string, rawAiResponseText?: string, analysis?: string, feedbackPoints?: string[], suggestedAlternative?: string })
} from '../types';

// --- Configuration & Client Initialization ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';

// Allow tests to run without API key when mocking
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

if (!GEMINI_API_KEY && !isTestEnvironment) {
  throw new Error("CRITICAL: GEMINI_API_KEY is not set.");
}

// Use the correct model name for Gemini 2.0
const MODEL_NAME_TEXT = 'gemini-2.0-flash-001';

// Initialize the GoogleGenAI client (with fallback for tests)
const genAI = new GoogleGenAI({
  apiKey: GEMINI_API_KEY || 'test-key-for-mocking',
});

// --- Prompt Construction Helper Functions ---
// These functions take context and build the `contents` array and `systemInstruction` string
// required by the `generateContent` API call.

/**
 * Constructs the system instruction string for the AI.
 * This sets the overall role and goal for the AI throughout the conversation.
 * @param persona - The persona definition (from personaService).
 * @returns The system instruction string.
 */
export function buildSystemInstruction(persona: Persona): string {
  // Combine the persona's system prompt with general instructions for the interview simulation role.
  // Keep this focused on the AI's identity and high-level task.
  return `You are an AI simulating an interview. Your goal is to act as a ${persona.name} and conduct a realistic interview based on the provided Job Description and Resume, considering the conversation history. Focus on topics relevant to a ${persona.name} role.\n\nPersona specific instructions: "${persona.systemPrompt}"`;
}

/**
 * Constructs the main content array for the generateContent API call.
 * This includes the JD/Resume context, instructions on response format, and the conversation history.
 * @param jdResumeText - The user's JD and Resume text.
 * @param persona - The persona definition (for context setting).
 * @param history - The previous conversation history.
 * @param currentUserResponse - The text of the user's last response (optional, for continueInterview).
 * @returns An array of Content objects formatted for the Gemini API.
 */
export function buildPromptContents(
  jdResumeText: JdResumeText,
  persona: Persona,
  history: MvpSessionTurn[],
  currentUserResponse?: string // Optional for the first question turn
): Content[] {
  const contents: Content[] = [];
  const systemInstructionText = buildSystemInstruction(persona);

  // First, set the system instruction and context
  contents.push({
    role: 'user',
    parts: [
      { text: systemInstructionText },
      { text: `\n\nJob Description:\n<JD>\n${jdResumeText.jdText}\n</JD>` },
      { text: `\n\nCandidate Resume:\n<RESUME>\n${jdResumeText.resumeText}\n</RESUME>` },
      {
        text: `\n\nIMPORTANT - Response Format Instructions:
You MUST respond in the following structured format for every response:

<QUESTION>Your interview question here?</QUESTION>
<ANALYSIS>Your analysis of the candidate's previous answer (if any).</ANALYSIS>
<FEEDBACK>Specific feedback points about the candidate's response (if any).</FEEDBACK>
<SUGGESTED_ALTERNATIVE>A better way the candidate could have answered (if any).</SUGGESTED_ALTERNATIVE>

For the first question, you can put "N/A" in the ANALYSIS, FEEDBACK, and SUGGESTED_ALTERNATIVE sections.
Always include ALL FOUR sections with the exact XML tags shown above.

Now start the interview with your first question.`
      },
    ],
  });

  // Add previous conversation turns
  for (const turn of history) {
      const role = turn.role === 'user' ? 'user' : 'model';
      let parts: Part[] = [{ text: turn.text }];

      if (turn.role === 'model' && turn.rawAiResponseText) {
          parts = [{ text: turn.rawAiResponseText }];
      }

      contents.push({ role, parts });
  }

  // Add the current user response
  if (currentUserResponse !== undefined) {
    contents.push({ role: 'user', parts: [{ text: currentUserResponse }] });
  }

  return contents;
}


// Helper to process the incoming stream chunks into a single raw string
async function processStream(streamResponse: AsyncIterable<GenerateContentResponse>): Promise<string> {
    let fullTextResponse = '';
    try {
        for await (const chunk of streamResponse) {
            // For the latest SDK, access text property directly
            if (chunk.text) {
                fullTextResponse += chunk.text;
            }
        }
    } catch (error) {
        console.error('Error processing stream:', error);
        throw new Error('Failed to process AI response stream');
    }
    return fullTextResponse;
}


// Helper to parse AI response based on XML delimiters
/**
 * Parses the raw text response from the AI into a structured MvpAiResponse object.
 * Uses defined delimiters (<QUESTION>, <ANALYSIS>, etc.).
 * @param rawResponse - The raw text string received from the Gemini API.
 * @returns A structured object containing the extracted parts.
 */
export function parseAiResponse(rawResponse: string): MvpAiResponse {
    const cleanedResponse = rawResponse ? rawResponse.trim() : "";

    const questionMatch = /<QUESTION>(.*?)<\/QUESTION>/s.exec(cleanedResponse);
    const analysisMatch = /<ANALYSIS>(.*?)<\/ANALYSIS>/s.exec(cleanedResponse);
    const feedbackMatch = /<FEEDBACK>(.*?)<\/FEEDBACK>/s.exec(cleanedResponse);
    const altMatch = /<SUGGESTED_ALTERNATIVE>(.*?)<\/SUGGESTED_ALTERNATIVE>/s.exec(cleanedResponse);

    const nextQuestion = questionMatch?.[1]?.trim() ?? "Error: Could not extract question from AI response.";
    const analysis = analysisMatch?.[1]?.trim() ?? "No analysis provided for this answer.";
    const feedbackRaw = feedbackMatch?.[1]?.trim() ?? "";
    const suggestedAlternative = altMatch?.[1]?.trim() ?? "No suggested alternative provided for this answer.";

    const feedbackPoints = feedbackRaw
        .split('\n')
        .map(point => point.trim())
        .filter(point => point.length > 0);

    // Log warnings for missing tags
    if (!questionMatch) console.warn("AI response missing <QUESTION> tag, raw response:", rawResponse);
    if (!analysisMatch) console.warn("AI response missing <ANALYSIS> tag, raw response:", rawResponse);
    if (!feedbackMatch) console.warn("AI response missing <FEEDBACK> tag, raw response:", rawResponse);
    if (!altMatch) console.warn("AI response missing <SUGGESTED_ALTERNATIVE> tag, raw response:", rawResponse);

    return {
        nextQuestion,
        analysis,
        feedbackPoints: feedbackPoints.length > 0 ? feedbackPoints : ["No specific feedback provided."],
        suggestedAlternative: suggestedAlternative || "No suggested alternative provided."
    };
}


// --- Core AI Interaction Functions (MVP - using generateContentStream) ---

/**
 * Starts a new interview conversation and gets the first question.
 * Uses generateContentStream but processes the full stream response before returning.
 * @param jdResumeText - The user's JD and Resume text.
 * @param persona - The persona definition (from personaService).
 * @returns A promise resolving to the text of the first question and the raw AI response text.
 */
export async function getFirstQuestion(
  jdResumeText: JdResumeText,
  persona: Persona
): Promise<{ questionText: string; rawAiResponseText: string }> {
  try {
    // Build the contents for the initial prompt (no history, no current user response)
    // System instruction is now part of buildPromptContents
    const contents = buildPromptContents(jdResumeText, persona, []);

    // Use the updated API call structure
    const response = await genAI.models.generateContentStream({
        model: MODEL_NAME_TEXT,
        contents: contents,
        config: {
            temperature: 0.7,
            maxOutputTokens: 1000,
        },
    });

    // Process the stream to get the complete raw text response
    const rawAiResponseText = await processStream(response);

    if (!rawAiResponseText) {
         console.error("Gemini returned empty response for first question.");
         throw new Error('Gemini returned an empty response.');
    }

    // Parse the full response to extract the first question
    const parsed = parseAiResponse(rawAiResponseText);

    // For the first question, we only need the question text for the frontend,
    // but we save the raw response text to the DB for history context in future turns.
    return {
        questionText: parsed.nextQuestion ?? "Error: Could not extract question from AI response.",
        rawAiResponseText: rawAiResponseText // Save the full structured response text
    };

  } catch (error) {
    console.error('Error getting first question from Gemini:', error);
    // Re-throw a more user-friendly error or handle appropriately
    throw new Error('Failed to start interview simulation due to an AI error.');
  }
}

/**
 * Continues an existing interview conversation by sending the user's response
 * and getting the AI's next turn (next question + feedback/alternative for the user's answer).
 * Uses generateContentStream but processes the full stream response before returning.
 * @param jdResumeText - The user's JD and Resume text.
 * @param persona - The persona definition.
 * @param history - The complete conversation history (Q&A pairs) *before* the current user response.
 * @param currentUserResponse - The text of the user's last response.
 * @returns A promise resolving to a structured AI response (next question, feedback, alternative)
 *          and the raw text output from the AI for saving in history.
 */
export async function continueInterview(
  jdResumeText: JdResumeText,
  persona: Persona,
  history: MvpSessionTurn[], // Array of previous turns including rawAiResponseText
  currentUserResponse: string
): Promise<MvpAiResponse & { rawAiResponseText: string }> {
  try {
    // System instruction is now part of buildPromptContents
    const contents = buildPromptContents(jdResumeText, persona, history, currentUserResponse);

    // Use the updated API call structure
    const response = await genAI.models.generateContentStream({
        model: MODEL_NAME_TEXT,
        contents: contents,
        config: {
            temperature: 0.7,
            maxOutputTokens: 1000,
        },
    });

    // Process the stream to get the complete raw text response
    const rawAiResponseText = await processStream(response);

    if (!rawAiResponseText) {
         console.error("Gemini returned empty response for continue interview.");
          throw new Error('Gemini returned an empty response.');
     }

    // Parse the raw text response into structured data
    const parsedResponse = parseAiResponse(rawAiResponseText);

    // Return the structured response along with the raw text for saving.
    return {
        ...parsedResponse,
        rawAiResponseText: rawAiResponseText // Save the full structured response text in the DB history
    };

  } catch (error) {
    console.error('Error continuing interview with Gemini:', error);
     // Re-throw a more user-friendly error or handle appropriately
    throw new Error('Failed to get next question and feedback from AI.');
  }
}

// ==============================================
// Phase 3A: Live Interview Functions (TDD)
// ==============================================

/**
 * Generate the next question in a live interview based on conversation history
 */
export async function getNextQuestion(
  conversationHistory: MvpSessionTurn[],
  persona: Persona
): Promise<string | null> {
  try {
    const conversationContext = conversationHistory
      .map(turn => `${turn.role === 'model' ? 'Interviewer' : 'Candidate'}: ${turn.text}`)
      .join('\n');

    const systemPrompt = `${persona.systemPrompt}

INTERVIEW CONTEXT:
Previous conversation:
${conversationContext}

INSTRUCTIONS:
- Generate the next logical interview question based on the conversation so far
- Build on the candidate's previous responses
- Keep questions relevant to the job requirements
- If the interview should end (after sufficient questions), respond with "END_INTERVIEW"
- Make questions progressively more specific and challenging
- Ensure smooth conversation flow

Generate only the next question, nothing else.`;

    const contents: Content[] = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
    ];

    const response = await genAI.models.generateContentStream({
      model: MODEL_NAME_TEXT,
      contents,
      config: {
        temperature: 0.7,
        maxOutputTokens: 200,
      },
    });

    let fullResponse = '';
    for await (const chunk of response) {
      if (chunk.text) {
        fullResponse += chunk.text;
      }
    }

    const nextQuestion = fullResponse.trim();
    
    // Check if interview should end
    if (nextQuestion.includes('END_INTERVIEW') || conversationHistory.length >= 10) {
      return null;
    }

    return nextQuestion;

  } catch (error) {
    console.error('Error generating next question:', error);
    throw new Error('Failed to generate next interview question');
  }
}

// --- Future: Multi-modal (Voice/Streaming) Functions ---
// These would use the `client.live` interface and require a stateful backend/WebSocket architecture.
// They would be implemented in a later phase, potentially in a different file or class managing
// the persistent stream connection.

// Example placeholder for future voice/streaming:
// export async function startLiveInterviewSession(...) {
//   // This would use client.live.connect(...)
//   console.warn("Live streaming (voice/stateful) not implemented in MVP gemini.ts");
//   throw new Error("Voice mode not available in this version.");