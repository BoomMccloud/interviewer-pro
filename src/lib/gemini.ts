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
// Use environment variables for API keys and configuration
// Ensure GEMINI_API_KEY is set in your .env.local
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
if (!GEMINI_API_KEY) {
  // Only throw if not using Vertex AI and API key is missing
  throw new Error("CRITICAL: GEMINI_API_KEY is not set.");
}
// Check if using Vertex AI based on env var from your examples
// const GOOGLE_GENAI_USE_VERTEXAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true'; // Remove this
// const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT; // Needed for Vertex AI
// const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION; // Needed for Vertex AI


// Choose the model for the MVP. 'gemini-2.0-flash' or similar from your examples.
// Use the specific model string suitable for the `generateContentStream` or `generateContent` method in this library.
// Check documentation for which models support `systemInstruction` and multi-turn via `contents`.
const MODEL_NAME_TEXT = 'gemini-2.0-flash'; // Use appropriate model names from your examples/docs


// Initialize the GoogleGenAI client
const genAI = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  // The vertexai property caused a type error.
  // If Vertex AI is used, it's typically configured via environment variables
  // or a different initialization path if this constructor doesn't support it directly.
  // Based on custom instructions, the constructor is new GoogleGenAI({ apiKey: ... })
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

  // The first entry sets the stage and includes persistent context like JD/Resume
  // and the system instruction.
   contents.push({
    role: 'user',
    parts: [
      { text: systemInstructionText }, // System instruction integrated here
      { text: `\n\nJob Description:\n<JD>\n${jdResumeText.jdText}\n</JD>` },
      { text: `\n\nCandidate Resume:\n<RESUME>\n${jdResumeText.resumeText}\n</RESUME>` },
      // Instructions for the AI's response format for each turn.
      // **IMPORTANT**: Make this format clear and consistent.
      {
        text: `\n\nFor each of your turns (after the first question), respond in a structured format containing the next question, an analysis of the candidate's previous answer, feedback points, and a suggested alternative answer. Use the exact following delimiters around each section:\n<QUESTION>Your next question here?</QUESTION>\n<ANALYSIS>Brief analysis of the candidate's last answer.</ANALYSIS>\n<FEEDBACK>Feedback points (use bullet points or newlines for multiple points).</FEEDBACK>\n<SUGGESTED_ALTERNATIVE>Example alternative answer for the previous question.</SUGGESTED_ALTERNATIVE>\n\nExample of how I expect your response to be structured:`
      },
    ],
  });


  // Add previous conversation turns (alternating user/model).
  // Ensure your history array format (MvpSessionTurn[]) is correctly mapped to Gemini's 'user'/'model' roles
  // and 'parts' structure. Assume MvpSessionTurn stores the full raw AI response text
  // so the AI sees its previous full structured output from its perspective.
  for (const turn of history) {
      // Map your internal role to Gemini's role
      const role = turn.role === 'user' ? 'user' : 'model';
      let parts: Part[] = [{ text: turn.text }]; // Default text part

      // If it's a model turn and you saved the full raw text with delimiters, use that
      if (turn.role === 'model' && turn.rawAiResponseText) {
          parts = [{ text: turn.rawAiResponseText }];
      }

      contents.push({ role, parts });
  }


  // Add the current user response. This is the final 'user' turn in the sequence.
  if (currentUserResponse !== undefined) {
    contents.push({ role: 'user', parts: [{ text: currentUserResponse }] });
  }

  return contents;
}


// Helper to process the incoming stream chunks into a single raw string
async function processStream(streamResponse: AsyncIterable<GenerateContentResponse>): Promise<string> {
    let fullTextResponse = '';
    for await (const chunk of streamResponse) {
        // The structure might be slightly different depending on the library version
        // and model, but the goal is to accumulate text.
        // The official SDK uses chunk.text() as a function.
        fullTextResponse += chunk.text;
        // If using Modality.IMAGE or other data types in the future, process chunk.data here
    }
    return fullTextResponse;
}


// Helper to parse AI response based on your chosen format (e.g., delimiters)
/**
 * Parses the raw text response from the AI into a structured MvpAiResponse object.
 * Uses defined delimiters (<QUESTION>, <ANALYSIS>, etc.).
 * @param rawResponse - The raw text string received from the Gemini API.
 * @returns A structured object containing the extracted parts.
 */
export function parseAiResponse(rawResponse: string): MvpAiResponse {
    // This function remains largely the same as before, as it parses *your defined format*
    // from the raw text, regardless of how the raw text was received (streamed or not).
    const cleanedResponse = rawResponse ? rawResponse.trim() : "";

    const questionMatch = /<QUESTION>(.*?)<\/QUESTION>/s.exec(cleanedResponse);
    const analysisMatch = /<ANALYSIS>(.*?)<\/ANALYSIS>/s.exec(cleanedResponse);
    const feedbackMatch = /<FEEDBACK>(.*?)<\/FEEDBACK>/s.exec(cleanedResponse);
    const altMatch = /<SUGGESTED_ALTERNATIVE>(.*?)<\/SUGGESTED_ALTERNATIVE>/s.exec(cleanedResponse);

    const nextQuestion = questionMatch?.[1]?.trim() ?? "Error: Could not extract next question. Please try again.";
    const analysis = analysisMatch?.[1]?.trim() ?? "No analysis provided for this answer.";
    const feedbackRaw = feedbackMatch?.[1]?.trim() ?? "";
    const suggestedAlternative = altMatch?.[1]?.trim() ?? "No suggested alternative provided for this answer.";

    const feedbackPoints = feedbackRaw
        .split('\n')
        .map(point => point.trim())
        .filter(point => point.length > 0);

     // Basic validation/logging if expected tags are missing
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

    // Call the generateContentStream API
    const streamResponse = await genAI.models.generateContentStream({
        model: MODEL_NAME_TEXT,
        // systemInstruction: { parts: [{ text: buildSystemInstruction(persona) }] }, // Removed as it's not a valid param here
        contents: contents,
         // Even though MVP is text, specifying Modality.TEXT might be required
    });

    // Process the stream to get the complete raw text response
    const rawAiResponseText = await processStream(streamResponse);

    if (!rawAiResponseText) {
         console.error("Gemini returned empty text stream response for first question.");
         throw new Error('Gemini returned an empty response stream.');
    }

    // Parse the full response to extract the first question
    const parsed = parseAiResponse(rawAiResponseText);

    // For the first question, we only need the question text for the frontend,
    // but we save the raw response text to the DB for history context in future turns.
    return {
        questionText: parsed.nextQuestion,
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

    // Call the generateContentStream API
    const streamResponse = await genAI.models.generateContentStream({
        model: MODEL_NAME_TEXT,
        // systemInstruction: { parts: [{ text: buildSystemInstruction(persona) }] }, // Removed
        contents: contents,
    });

    // Process the stream to get the complete raw text response
    const rawAiResponseText = await processStream(streamResponse);

    if (!rawAiResponseText) {
         console.error("Gemini returned empty text stream response for continue interview.");
          throw new Error('Gemini returned an empty response stream.');
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

// --- Future: Multi-modal (Voice/Streaming) Functions ---
// These would use the `client.live` interface and require a stateful backend/WebSocket architecture.
// They would be implemented in a later phase, potentially in a different file or class managing
// the persistent stream connection.

// Example placeholder for future voice/streaming:
// export async function startLiveInterviewSession(...) {
//   // This would use client.live.connect(...)
//   console.warn("Live streaming (voice/stateful) not implemented in MVP gemini.ts");
//   throw new Error("Voice mode not available in this version.");