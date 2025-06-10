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
  ConversationalResponse,
  TopicalQuestionResponse
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
<KEY_POINTS>
- Specific point about what the candidate should focus on in their answer
- Another key area they should address
- Third important aspect to cover
</KEY_POINTS>
<ANALYSIS>Your analysis of the candidate's previous answer (if any).</ANALYSIS>
<FEEDBACK>Specific feedback points about the candidate's response (if any).</FEEDBACK>
<SUGGESTED_ALTERNATIVE>A better way the candidate could have answered (if any).</SUGGESTED_ALTERNATIVE>

For the first question, you can put "N/A" in the ANALYSIS, FEEDBACK, and SUGGESTED_ALTERNATIVE sections.
The KEY_POINTS should always contain 3-4 specific, actionable points tailored to the question you're asking.
Always include ALL FIVE sections with the exact XML tags shown above.

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
 * Uses defined delimiters (<QUESTION>, <KEY_POINTS>, <ANALYSIS>, etc.).
 * @param rawResponse - The raw text string received from the Gemini API.
 * @returns A structured object containing the extracted parts.
 */
export function parseAiResponse(rawResponse: string): MvpAiResponse {
    const cleanedResponse = rawResponse ? rawResponse.trim() : "";

    const questionMatch = /<QUESTION>(.*?)<\/QUESTION>/s.exec(cleanedResponse);
    const keyPointsMatch = /<KEY_POINTS>(.*?)<\/KEY_POINTS>/s.exec(cleanedResponse);
    const analysisMatch = /<ANALYSIS>(.*?)<\/ANALYSIS>/s.exec(cleanedResponse);
    const feedbackMatch = /<FEEDBACK>(.*?)<\/FEEDBACK>/s.exec(cleanedResponse);
    const altMatch = /<SUGGESTED_ALTERNATIVE>(.*?)<\/SUGGESTED_ALTERNATIVE>/s.exec(cleanedResponse);

    const nextQuestion = questionMatch?.[1]?.trim() ?? "Error: Could not extract question from AI response.";
    const analysis = analysisMatch?.[1]?.trim() ?? "No analysis provided for this answer.";
    const feedbackRaw = feedbackMatch?.[1]?.trim() ?? "";
    const suggestedAlternative = altMatch?.[1]?.trim() ?? "No suggested alternative provided for this answer.";
    
    // Parse key points from the KEY_POINTS section
    const keyPointsRaw = keyPointsMatch?.[1]?.trim() ?? "";
    const keyPoints = keyPointsRaw
        .split('\n')
        .map(point => point.replace(/^-\s*/, '').trim()) // Remove leading dashes and whitespace
        .filter(point => point.length > 0);

    const feedbackPoints = feedbackRaw
        .split('\n')
        .map(point => point.replace(/^-\s*/, '').trim()) // Remove leading dashes and whitespace  
        .filter(point => point.length > 0);

    // Log warnings for missing tags
    if (!questionMatch) console.warn("AI response missing <QUESTION> tag, raw response:", rawResponse);
    if (!keyPointsMatch) console.warn("AI response missing <KEY_POINTS> tag, raw response:", rawResponse);
    
    // Only warn about missing analysis/feedback for responses (not first questions)
    if (cleanedResponse.includes('<ANALYSIS>') && !analysisMatch) {
        console.warn("AI response missing <ANALYSIS> tag, raw response:", rawResponse);
    }
    if (cleanedResponse.includes('<FEEDBACK>') && !feedbackMatch) {
        console.warn("AI response missing <FEEDBACK> tag, raw response:", rawResponse);
    }

    return {
        nextQuestion,
        keyPoints: keyPoints.length > 0 ? keyPoints : ["Focus on your specific role", "Highlight technologies used", "Discuss challenges overcome"],
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
 * @deprecated This function is no longer used in the application.
 * Use continueConversation() instead for natural conversation flow.
 * Will be removed in a future version.
 * 
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
  console.warn('continueInterview() is deprecated. Use continueConversation() instead.');
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
 * @deprecated This function is no longer used in the application.
 * Use getNewTopicalQuestion() for topic transitions instead.
 * Will be removed in a future version.
 * 
 * Generate the next question in a live interview based on conversation history
 */
export async function getNextQuestion(
  conversationHistory: MvpSessionTurn[],
  persona: Persona
): Promise<string | null> {
  console.warn('getNextQuestion() is deprecated. Use getNewTopicalQuestion() instead.');
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

/**
 * 🔵 REFACTOR Phase - Truly Natural Conversation with Light Topic Guidance
 * Trusts AI to handle conversation naturally with minimal interference.
 */
export async function continueConversation(
  jdResumeText: JdResumeText,
  persona: Persona,
  history: MvpSessionTurn[],
  userResponse: string,
  currentTopic?: string
): Promise<ConversationalResponse> {
  // Enhanced validation
  if (!userResponse || userResponse.trim().length === 0) {
    throw new Error('User response cannot be empty');
  }

  if (userResponse.trim().length > 2000) {
    throw new Error('User response is too long (max 2000 characters)');
  }

  try {
    // Build natural conversation prompt with light topic guidance
    const contents = buildNaturalConversationPrompt(jdResumeText, persona, history, userResponse, currentTopic);

    const response = await genAI.models.generateContentStream({
      model: MODEL_NAME_TEXT,
      contents: contents,
      config: {
        temperature: 0.8, // Higher temperature for more natural, varied responses
        maxOutputTokens: 400, // Shorter responses for more natural conversation
        topP: 0.9,
        topK: 40,
      },
    });

    const rawAiResponseText = await processStream(response);
    
    if (!rawAiResponseText) {
      throw new Error('AI returned empty response');
    }

    // ✨ TRUST THE AI - use its response directly with minimal processing
    const naturalResponse = rawAiResponseText.trim();

    // Only use fallback if AI response is suspiciously short or generic
    let finalResponse = naturalResponse;
    if (naturalResponse.length < 10 || 
        naturalResponse.toLowerCase().includes('tell me more about that') ||
        naturalResponse.toLowerCase().includes('can you elaborate')) {
      
      // Generate a better contextual follow-up only as last resort
      finalResponse = generateBetterContextualFollowUp(userResponse, currentTopic);
    }

    // Extract insights from user response for feedback
    const insights = extractInsightsFromResponse(userResponse, currentTopic);

    return {
      analysis: `Your response shows engagement with the ${currentTopic ?? 'topic'}. Let's explore this further.`,
      feedbackPoints: insights,
      followUpQuestion: finalResponse, // ✅ Trust the AI (or smart fallback)
      rawAiResponseText: rawAiResponseText,
    };

  } catch (error) {
    console.error('Error in continueConversation:', error);
    throw new Error('Failed to continue conversation');
  }
}

/**
 * 🔵 REFACTOR Phase - Enhanced Implementation  
 * Generates new topical questions for topic transitions only.
 * Does NOT provide conversational responses.
 */
export async function getNewTopicalQuestion(
  jdResumeText: JdResumeText,
  persona: Persona,
  history: MvpSessionTurn[],
  coveredTopics?: string[]
): Promise<TopicalQuestionResponse> {
  try {
    // Build enhanced topic-generation prompt
    const contents = buildTopicalPrompt(jdResumeText, persona, history, coveredTopics);

    const response = await genAI.models.generateContentStream({
      model: MODEL_NAME_TEXT,
      contents: contents,
      config: {
        temperature: 0.8, // Higher creativity for diverse topic selection
        maxOutputTokens: 800, // Sufficient for question + key points
        topP: 0.85,
        topK: 50, // More diversity for topic selection
      },
    });

    const rawAiResponseText = await processStream(response);
    
    if (!rawAiResponseText) {
      throw new Error('AI returned empty response');
    }

    // Enhanced topical response parsing
    const parsed = parseTopicalResponse(rawAiResponseText);

    // Validate question quality and topic uniqueness
    if (!parsed.questionText || parsed.questionText.length < 15) {
      console.warn('AI returned insufficient question text, using fallback');
      parsed.questionText = generateFallbackQuestion(jdResumeText, coveredTopics);
    }

    if (parsed.keyPoints.length < 3) {
      console.warn('AI returned insufficient key points, adding fallbacks');
      parsed.keyPoints = [
        ...parsed.keyPoints,
        ...getFallbackKeyPoints(parsed.questionText).slice(0, 4 - parsed.keyPoints.length)
      ];
    }

    return {
      questionText: parsed.questionText,
      keyPoints: parsed.keyPoints,
      rawAiResponseText: rawAiResponseText,
    };

  } catch (error) {
    console.error('Error in getNewTopicalQuestion:', error);
    throw new Error('Failed to generate new topical question');
  }
}

// Enhanced helper functions

function buildConversationalPrompt(
  jdResumeText: JdResumeText,
  persona: Persona,
  history: MvpSessionTurn[],
  userResponse: string
): Content[] {
  const contents: Content[] = [];
  const systemInstructionText = buildConversationalSystemInstruction(persona);

  contents.push({
    role: 'user',
    parts: [
      { text: systemInstructionText },
      { text: `\n\nJob Description:\n<JD>\n${jdResumeText.jdText}\n</JD>` },
      { text: `\n\nCandidate Resume:\n<RESUME>\n${jdResumeText.resumeText}\n</RESUME>` },
      {
        text: `\n\nIMPORTANT - Conversational Response Format:
You MUST respond in the following format for conversational follow-ups:

<ANALYSIS>Your detailed analysis of the candidate's response.</ANALYSIS>
<FEEDBACK>
- Specific feedback point about their answer
- Another area for improvement or strength  
- Third constructive point
</FEEDBACK>
<FOLLOW_UP>Your follow-up question about the SAME topic - dig deeper, don't change topics.</FOLLOW_UP>

Do NOT include <QUESTION> or <KEY_POINTS> sections - those are for new topics only.
Focus on analyzing their response and asking follow-up questions about the current topic.
Do NOT transition to new interview topics.`
      },
    ],
  });

  // Add conversation history
  for (const turn of history) {
    const role = turn.role === 'user' ? 'user' : 'model';
    let parts: Part[] = [{ text: turn.text }];

    if (turn.role === 'model' && turn.rawAiResponseText) {
      parts = [{ text: turn.rawAiResponseText }];
    }

    contents.push({ role, parts });
  }

  // Add current user response
  contents.push({ role: 'user', parts: [{ text: userResponse }] });

  return contents;
}

function buildTopicalPrompt(
  jdResumeText: JdResumeText,
  persona: Persona,
  history: MvpSessionTurn[],
  coveredTopics?: string[]
): Content[] {
  const contents: Content[] = [];
  const systemInstructionText = buildTopicalSystemInstruction(persona);

  const coveredTopicsText = coveredTopics && coveredTopics.length > 0 
    ? `\n\nTopics already covered: ${coveredTopics.join(', ')}`
    : '';

  contents.push({
    role: 'user',
    parts: [
      { text: systemInstructionText },
      { text: `\n\nJob Description:\n<JD>\n${jdResumeText.jdText}\n</JD>` },
      { text: `\n\nCandidate Resume:\n<RESUME>\n${jdResumeText.resumeText}\n</RESUME>` },
      { text: coveredTopicsText },
      {
        text: `\n\nIMPORTANT - New Topic Question Format:
You MUST respond in the following format for new topical questions:

<QUESTION>Your new interview question about a different topic?</QUESTION>
<KEY_POINTS>
- Specific point about what the candidate should focus on
- Another key area they should address  
- Third important aspect to cover
</KEY_POINTS>

Generate a NEW topic that is different from any covered topics.
Focus on job description requirements and resume experience not yet explored.
Do NOT repeat previously covered topics.`
      },
    ],
  });

  return contents;
}

function buildConversationalSystemInstruction(persona: Persona): string {
  return `You are conducting a conversational interview within the current topic. ${persona.systemPrompt}

CRITICAL INSTRUCTIONS:
- Stay focused on the current topic being discussed
- Do NOT introduce new interview topics or areas
- Provide thorough analysis of the candidate's response
- Ask follow-up questions that dig deeper into the same subject
- Give constructive, specific feedback
- Help the candidate demonstrate their experience fully

Your goal is to have a natural conversation that explores the current topic in depth, not to move to new areas.`;
}

function buildTopicalSystemInstruction(persona: Persona): string {
  return `You are generating new topical interview questions. ${persona.systemPrompt}

CRITICAL INSTRUCTIONS:
- Generate questions about NEW topics not yet covered
- Focus on job description requirements and resume experience
- Avoid repeating previously discussed topics
- Create distinct, focused questions for each topic area
- Provide helpful key points to guide the candidate
- Ensure questions are substantive and interview-appropriate

Your goal is to select the next most important topic to explore based on the job requirements.`;
}

function parseConversationalResponse(rawResponse: string): {
  analysis: string;
  feedbackPoints: string[];
  followUpQuestion: string;
} {
  const cleanedResponse = rawResponse ? rawResponse.trim() : "";

  const analysisMatch = /<ANALYSIS>(.*?)<\/ANALYSIS>/s.exec(cleanedResponse);
  const feedbackMatch = /<FEEDBACK>(.*?)<\/FEEDBACK>/s.exec(cleanedResponse);
  const followUpMatch = /<FOLLOW_UP>(.*?)<\/FOLLOW_UP>/s.exec(cleanedResponse);

  const analysis = analysisMatch?.[1]?.trim() ?? "Good response - shows relevant experience and understanding.";
  const feedbackRaw = feedbackMatch?.[1]?.trim() ?? "";
  const followUpQuestion = followUpMatch?.[1]?.trim() ?? "Can you tell me more about that experience?";

  // Enhanced feedback parsing
  const feedbackPoints = feedbackRaw
    .split('\n')
    .map(point => point.replace(/^[-•*]\s*/, '').trim()) // Handle different bullet styles
    .filter(point => point.length > 3); // Filter out very short points

  return {
    analysis,
    feedbackPoints: feedbackPoints.length > 0 ? feedbackPoints : [
      "Shows good understanding of the topic",
      "Demonstrates relevant experience", 
      "Could benefit from more specific details"
    ],
    followUpQuestion,
  };
}

function parseTopicalResponse(rawResponse: string): {
  questionText: string;
  keyPoints: string[];
} {
  const cleanedResponse = rawResponse ? rawResponse.trim() : "";

  const questionMatch = /<QUESTION>(.*?)<\/QUESTION>/s.exec(cleanedResponse);
  const keyPointsMatch = /<KEY_POINTS>(.*?)<\/KEY_POINTS>/s.exec(cleanedResponse);

  const questionText = questionMatch?.[1]?.trim() ?? "";
  const keyPointsRaw = keyPointsMatch?.[1]?.trim() ?? "";

  // Enhanced key points parsing
  const keyPoints = keyPointsRaw
    .split('\n')
    .map(point => point.replace(/^[-•*]\s*/, '').trim()) // Handle different bullet styles
    .filter(point => point.length > 5); // Filter out very short points

  return {
    questionText,
    keyPoints,
  };
}

// Enhanced fallback functions

function generateFallbackQuestion(jdResumeText: JdResumeText, coveredTopics?: string[]): string {
  // Extract key requirements from JD that haven't been covered
  const jdLower = jdResumeText.jdText.toLowerCase();
  const covered = (coveredTopics ?? []).map(t => t.toLowerCase());
  
  const fallbackQuestions = [
    { keywords: ['node', 'backend', 'server'], question: 'Tell me about your backend development experience with Node.js or other server technologies.' },
    { keywords: ['team', 'leadership', 'manage'], question: 'Describe your experience working with or leading development teams.' },
    { keywords: ['system', 'design', 'architecture'], question: 'Walk me through your approach to system design and architecture decisions.' },
    { keywords: ['database', 'sql', 'data'], question: 'Tell me about your experience with databases and data management.' },
    { keywords: ['testing', 'quality', 'qa'], question: 'How do you approach testing and ensuring code quality in your projects?' },
  ];

  for (const fallback of fallbackQuestions) {
    const hasKeyword = fallback.keywords.some(keyword => jdLower.includes(keyword));
    const alreadyCovered = covered.some(topic => 
      fallback.keywords.some(keyword => topic.includes(keyword))
    );
    
    if (hasKeyword && !alreadyCovered) {
      return fallback.question;
    }
  }

  return 'Tell me about a challenging project you worked on and how you approached solving the key problems.';
}

function getFallbackKeyPoints(questionText: string): string[] {
  const questionLower = questionText.toLowerCase();
  
  if (questionLower.includes('backend') || questionLower.includes('node')) {
    return [
      'Describe specific backend technologies used',
      'Explain API design and architecture decisions',
      'Discuss performance optimization strategies',
      'Share challenges with scalability or data management'
    ];
  }
  
  if (questionLower.includes('team') || questionLower.includes('leadership')) {
    return [
      'Describe your role and responsibilities',
      'Explain how you handle team collaboration',
      'Discuss mentoring or coaching experience',
      'Share examples of conflict resolution'
    ];
  }
  
  if (questionLower.includes('system') || questionLower.includes('design')) {
    return [
      'Explain your design process and methodology',
      'Discuss trade-offs and decision criteria',
      'Describe how you handle scalability requirements',
      'Share examples of architectural challenges'
    ];
  }
  
  return [
    'Focus on specific examples and outcomes',
    'Highlight your role and contributions',
    'Discuss challenges faced and solutions implemented',
    'Explain the impact of your work'
  ];
}

// Enhanced helper functions for natural conversation with light topic guidance

function buildNaturalConversationPrompt(
  jdResumeText: JdResumeText,
  persona: Persona,
  history: MvpSessionTurn[],
  userResponse: string,
  currentTopic?: string
): Content[] {
  const contents: Content[] = [];
  
  // Build conversation context from history (only recent turns to keep it focused)
  const recentHistory = history.slice(-6); // Last 6 turns to keep context manageable
  const conversationSoFar = recentHistory
    .map(turn => `${turn.role === 'user' ? 'Candidate' : 'Interviewer'}: ${turn.text}`)
    .join('\n');

  const topicGuidance = currentTopic 
    ? `Current conversation focus: ${currentTopic}`
    : `No specific topic - explore naturally`;

  const naturalPrompt = `You are a ${persona.name} having a natural, engaging interview conversation.

${topicGuidance}

Job they're applying for:
${jdResumeText.jdText}

Candidate's background:
${jdResumeText.resumeText}

Recent conversation:
${conversationSoFar}

Candidate just said: "${userResponse}"

INSTRUCTIONS:
- Respond naturally and conversationally, like a real interviewer would
- Ask thoughtful, specific follow-up questions based on what they just shared
- Show genuine curiosity about their experience
- If they mention something interesting, dig deeper into that specific aspect
- Keep responses concise and focused (1-2 sentences max)
- Be encouraging and supportive
- NO generic questions like "tell me more" or "can you elaborate"

Respond with just your natural follow-up question or comment.`;

  contents.push({
    role: 'user',
    parts: [{ text: naturalPrompt }],
  });

  return contents;
}

function generateBetterContextualFollowUp(
  userResponse: string,
  currentTopic?: string
): string {
  const response = userResponse.toLowerCase();
  
  // Analyze user response for specific concepts to ask about
  if (response.includes('graduated') || response.includes('degree') || response.includes('university')) {
    const followUps = [
      "What skills from your studies are you most excited to apply in a professional setting?",
      "How did your academic projects prepare you for real-world challenges?",
      "What specific courses or experiences shaped your career interests?",
      "Which professors or projects had the biggest impact on your learning?"
    ];
    return followUps[Math.floor(Math.random() * followUps.length)] || followUps[0];
  }

  if (response.includes('mentor') || response.includes('junior') || response.includes('code review')) {
    const followUps = [
      "What's your approach when a junior developer disagrees with your feedback?",
      "How do you balance being supportive with maintaining code quality standards?",
      "What's the most challenging mentoring situation you've handled?",
      "How do you help junior developers grow beyond just fixing their code?"
    ];
    return followUps[Math.floor(Math.random() * followUps.length)] || followUps[0];
  }

  if (response.includes('party') || response.includes('fun') || response.includes('social')) {
    const followUps = [
      "How do you balance having fun with getting things done when working on projects?",
      "What role does team culture and social interaction play in your ideal workplace?",
      "How do you think your social skills contribute to team collaboration?",
      "What does work-life balance mean to you?"
    ];
    return followUps[Math.floor(Math.random() * followUps.length)] || followUps[0];
  }

  if (response.includes('project') || response.includes('built') || response.includes('developed')) {
    const followUps = [
      "What was the most unexpected challenge you encountered in that project?",
      "How did you decide on the technical approach you used?",
      "What would you change about your approach if you were starting over?",
      "What's the most valuable lesson you learned from that experience?"
    ];
    return followUps[Math.floor(Math.random() * followUps.length)] || followUps[0];
  }

  // Topic-specific intelligent questions
  if (currentTopic?.toLowerCase().includes('team')) {
    const followUps = [
      "Tell me about a time when you had to convince teammates to try a different approach.",
      "How do you handle situations where team members have conflicting ideas?",
      "What's your strategy for building trust with new team members?",
      "Describe how you've contributed to improving team processes."
    ];
    return followUps[Math.floor(Math.random() * followUps.length)] || followUps[0];
  }

  if (currentTopic?.toLowerCase().includes('technical') || currentTopic?.toLowerCase().includes('react')) {
    const followUps = [
      "Walk me through how you approach debugging a complex technical issue.",
      "What's your process for staying current with new technologies?",
      "How do you balance writing clean code with meeting deadlines?",
      "Tell me about a technical decision you're particularly proud of."
    ];
    return followUps[Math.floor(Math.random() * followUps.length)] || followUps[0];
  }

  // Smart fallbacks based on response length and content
  if (response.length < 20) {
    const shortResponseFollowUps = [
      "Could you paint me a clearer picture of that situation?",
      "What context would help me understand that better?",
      "I'd love to hear more specifics about what that looked like.",
      "Can you walk me through what actually happened there?"
    ];
    return shortResponseFollowUps[Math.floor(Math.random() * shortResponseFollowUps.length)] || shortResponseFollowUps[0];
  }

  // Thoughtful generic fallbacks (much better than the old ones)
  const smartGenericFollowUps = [
    "What made that experience particularly meaningful to you?",
    "How has that shaped your professional perspective?",
    "What surprised you most about that situation?",
    "What skills did you develop through that experience?"
  ];
  
  return smartGenericFollowUps[Math.floor(Math.random() * smartGenericFollowUps.length)] || smartGenericFollowUps[0];
}

function extractInsightsFromResponse(userResponse: string, currentTopic?: string): string[] {
  const insights: string[] = [];
  const response = userResponse.toLowerCase();

  // Extract positive indicators
  if (response.includes('challenge') || response.includes('difficult')) {
    insights.push("Shows willingness to tackle challenging problems");
  }
  
  if (response.includes('team') || response.includes('collaborate')) {
    insights.push("Demonstrates collaborative approach");
  }
  
  if (response.includes('learn') || response.includes('research')) {
    insights.push("Shows continuous learning mindset");
  }

  if (response.includes('improve') || response.includes('optimize')) {
    insights.push("Focuses on improvement and optimization");
  }

  // Topic-specific insights
  if (currentTopic) {
    insights.push(`Demonstrates knowledge relevant to ${currentTopic}`);
  }

  // Default insights if none detected
  if (insights.length === 0) {
    insights.push("Provides relevant examples from experience");
    insights.push("Shows practical understanding of the topic");
  }

  return insights.slice(0, 3); // Keep it concise
}