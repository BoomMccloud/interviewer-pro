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
  MvpSessionTurn, // Type for storing a single turn in session history ({ role: 'user' | 'model', text: string, rawAiResponseText?: string, analysis?: string, feedbackPoints?: string[], suggestedAlternative?: string })
  ConversationalResponse,
  TopicalQuestionResponse,
  QuestionSegment,
  OverallAssessment,
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
 * @param currentUserResponse - The text of the user's last response (optional, for conversation context).
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


// Modern AI response processing uses direct stream processing and specialized parsers
function parseStructuredResponse(rawResponse: string): {
  questionText: string;
  keyPoints: string[];
  analysis: string;
  feedback: string;
  suggestedAlternative: string;
} {
  const cleanedResponse = rawResponse ? rawResponse.trim() : "";

  const questionMatch = /<QUESTION>(.*?)<\/QUESTION>/s.exec(cleanedResponse);
  const keyPointsMatch = /<KEY_POINTS>(.*?)<\/KEY_POINTS>/s.exec(cleanedResponse);
  const analysisMatch = /<ANALYSIS>(.*?)<\/ANALYSIS>/s.exec(cleanedResponse);
  const feedbackMatch = /<FEEDBACK>(.*?)<\/FEEDBACK>/s.exec(cleanedResponse);
  const suggestedAlternativeMatch = /<SUGGESTED_ALTERNATIVE>(.*?)<\/SUGGESTED_ALTERNATIVE>/s.exec(cleanedResponse);

  const questionText = questionMatch?.[1]?.trim() ?? "";
  const keyPointsRaw = keyPointsMatch?.[1]?.trim() ?? "";
  
  const keyPoints = keyPointsRaw
    .split('\n')
    .map(point => point.replace(/^[-•*]\s*/, '').trim())
    .filter(point => point.length > 5);

  return {
    questionText,
    keyPoints,
    analysis: analysisMatch?.[1]?.trim() ?? "N/A",
    feedback: feedbackMatch?.[1]?.trim() ?? "N/A",
    suggestedAlternative: suggestedAlternativeMatch?.[1]?.trim() ?? "N/A",
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
  persona: Persona,
  questionSegments: QuestionSegment[],
): Promise<TopicalQuestionResponse> {
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

    // NEW: Parse the structured response
    const parsedResponse = parseStructuredResponse(rawAiResponseText);

    // For the first question, we only need the question text for the frontend,
    // but we save the raw response text to the DB for history context in future turns.
    return {
        questionText: parsedResponse.questionText || "Error: Could not extract question from AI response.",
        keyPoints: parsedResponse.keyPoints,
        rawAiResponseText: rawAiResponseText // Save the full structured response text
    };

  } catch (error) {
    console.error('🚨 FALLBACK TRIGGERED: getFirstQuestion failed, using fallback question', error);
    
    // Fallback question when AI completely fails
    const fallbackQuestion = `Hello! I'm excited to learn about your experience. Let's start with a fundamental question: Tell me about yourself and what draws you to this role. [FALLBACK: AI generation failed]`;
    
    console.log('📝 Using fallback first question due to AI error');
    
    return {
      questionText: fallbackQuestion,
      keyPoints: getFallbackKeyPoints(fallbackQuestion),
      rawAiResponseText: `FALLBACK_RESPONSE: AI generation failed, using fallback question. Original error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Generates a high-level assessment of an interview session using the LLM.
 * This is intended for the report page.
 * @param {JdResumeText} jdResumeText - The JD and Resume text.
 * @param {Persona} persona - The persona of the interviewer.
 * @param {QuestionSegment[]} questionSegments - The full conversation history.
 * @returns {Promise<OverallAssessment>} A promise that resolves to the structured assessment.
 */
export async function getOverallAssessmentFromLLM(
  jdResumeText: JdResumeText,
  persona: Persona,
  questionSegments: QuestionSegment[],
): Promise<OverallAssessment> {
    console.log("Generating overall assessment from LLM...");

    const conversationHistory = questionSegments.map(q => 
        `Question: ${q.question}\n${q.conversation.map(t => `${t.role}: ${t.content}`).join('\n')}`
    ).join('\n\n');

    const prompt = `
        As a senior hiring manager reviewing an interview transcript, provide a comprehensive assessment.
        
        **Role of the Interviewer:** ${persona.name} (${persona.systemPrompt})
        **Job Description:**\n${jdResumeText.jdText}
        **Candidate's Resume:**\n${jdResumeText.resumeText}

        **Full Interview Transcript:**
        ${conversationHistory}

        Based on the transcript, JD, and resume, provide the following in a structured format:
        
        <SUMMARY>
        A 2-3 sentence high-level summary of the candidate's performance.
        </SUMMARY>

        <STRENGTHS>
        - Point 1
        - Point 2
        - Point 3
        </STRENGTHS>

        <IMPROVEMENTS>
        - Point 1
        - Point 2
        - Point 3
        </IMPROVEMENTS>

        <SCORE>
        A single integer score from 1 to 10.
        </SCORE>
    `;

    try {
        const resultStream = await genAI.models.generateContentStream({
            model: MODEL_NAME_TEXT,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                temperature: 0.5,
                maxOutputTokens: 1500,
            }
        });

        const responseText = await processStream(resultStream);

        const summary = /<SUMMARY>(.*?)<\/SUMMARY>/s.exec(responseText)?.[1]?.trim() ?? "Summary not available.";
        const strengths = /<STRENGTHS>(.*?)<\/STRENGTHS>/s.exec(responseText)?.[1]?.trim().split('\n').map(s => s.replace(/^- /, '')) ?? [];
        const improvements = /<IMPROVEMENTS>(.*?)<\/IMPROVEMENTS>/s.exec(responseText)?.[1]?.trim().split('\n').map(s => s.replace(/^- /, '')) ?? [];
        const scoreStr = /<SCORE>(.*?)<\/SCORE>/s.exec(responseText)?.[1]?.trim();
        const score = scoreStr ? parseInt(scoreStr, 10) : 5;

        return { summary, strengths, improvements, score };

    } catch (error) {
        console.error('Error getting overall assessment from LLM:', error);
        return {
            summary: "Could not generate assessment due to an error.",
            strengths: [],
            improvements: [],
            score: 0,
        };
    }
}

/**
 * Generates specific feedback for a single question and answer exchange.
 * @param {QuestionSegment} question - The specific question segment to analyze.
 * @returns {Promise<{ contentFeedback: string; clarityFeedback: string; confidenceFeedback: string; suggestedAnswer: string; }>} Feedback object.
 */
export async function getQuestionFeedbackFromLLM(
    question: QuestionSegment
): Promise<{ contentFeedback: string; clarityFeedback: string; confidenceFeedback: string; suggestedAnswer: string; }> {
    console.log(`Generating feedback for question: "${question.question}"`);

    const conversationTranscript = question.conversation.map(t => `${t.role}: ${t.content}`).join('\n');

    const prompt = `
        As an interview coach, analyze the following exchange and provide targeted feedback.

        **The Question Asked:**
        ${question.question}

        **Key points the interviewer was looking for:**
        ${question.keyPoints.join('\n- ')}

        **The Candidate's Response(s):**
        ${conversationTranscript}

        ---
        **INSTRUCTIONS**
        Provide feedback based *only* on the candidate's response to this specific question.
        You MUST respond in the following format. Do not add any extra text or formatting outside of these tags.

        <CONTENT_FEEDBACK>
        Critique the substance of the answer. Did they address the key points? Was it relevant?
        </CONTENT_FEEDBACK>

        <CLARITY_FEEDBACK>
        Comment on the clarity and structure of their communication. Was it easy to follow?
        </CLARITY_FEEDBACK>

        <CONFIDENCE_FEEDBACK>
        Assess the perceived confidence in their response. Did they sound knowledgeable?
        </CONFIDENCE_FEEDBACK>

        <SUGGESTED_ANSWER>
        Provide a well-structured, example answer that effectively addresses the question and key points. This answer should follow the STAR method (Situation, Task, Action, Result) where appropriate.
        </SUGGESTED_ANSWER>
    `;

    try {
        const resultStream = await genAI.models.generateContentStream({
            model: MODEL_NAME_TEXT,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                temperature: 0.6,
                maxOutputTokens: 1000,
            }
        });

        const responseText = await processStream(resultStream);

        const contentFeedback = /<CONTENT_FEEDBACK>(.*?)<\/CONTENT_FEEDBACK>/s.exec(responseText)?.[1]?.trim() ?? "N/A";
        const clarityFeedback = /<CLARITY_FEEDBACK>(.*?)<\/CLARITY_FEEDBACK>/s.exec(responseText)?.[1]?.trim() ?? "N/A";
        const confidenceFeedback = /<CONFIDENCE_FEEDBACK>(.*?)<\/CONFIDENCE_FEEDBACK>/s.exec(responseText)?.[1]?.trim() ?? "N/A";
        const suggestedAnswer = /<SUGGESTED_ANSWER>(.*?)<\/SUGGESTED_ANSWER>/s.exec(responseText)?.[1]?.trim() ?? "Could not generate a suggested answer.";

        return { contentFeedback, clarityFeedback, confidenceFeedback, suggestedAnswer };
    } catch (error) {
        console.error('Error getting question feedback from LLM:', error);
        return {
            contentFeedback: "Error generating feedback.",
            clarityFeedback: "Error generating feedback.",
            confidenceFeedback: "Error generating feedback.",
            suggestedAnswer: "Error generating suggested answer."
        };
    }
}

/**
 * Generates a response from the AI coach in a feedback conversation.
 * @param history The history of the coaching conversation.
 * @returns A promise that resolves to the AI's chat response.
 */
export async function getChatResponse(
    history: { role: 'user' | 'ai', content: string }[]
): Promise<string> {
    console.log("Generating chat response from coach...");

    const prompt = `
        You are an encouraging and helpful interview coach.
        A user is asking for advice about one of their previous interview answers.
        Your goal is to provide specific, constructive, and actionable advice.
        Keep your responses concise and conversational (2-4 sentences).
        
        **Conversation so far:**
        ${history.map(h => `${h.role}: ${h.content}`).join('\n')}

        Based on the last user message, provide a helpful and encouraging response.
    `;

    try {
        const resultStream = await genAI.models.generateContentStream({
            model: MODEL_NAME_TEXT,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                temperature: 0.8,
                maxOutputTokens: 300,
            }
        });

        return await processStream(resultStream);
    } catch (error) {
        console.error('Error getting chat response from LLM:', error);
        return "I'm sorry, I encountered an error and can't provide a response right now.";
    }
}

// Alias for backwards compatibility with the report router
export const getQuestionInitialFeedback = getQuestionFeedbackFromLLM;

// ==============================================
// INTERNAL HELPER FUNCTIONS
// ==============================================

// ==============================================
// Phase 3A: Live Interview Functions (TDD)
// ==============================================

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
      
      console.warn('🚨 FALLBACK TRIGGERED: AI response was too generic/short, using smart fallback');
      console.log(`📝 Original AI response: "${naturalResponse}"`);
      
      // Generate a better contextual follow-up only as last resort
      finalResponse = generateBetterContextualFollowUp(userResponse, currentTopic) + ' [FALLBACK: AI response was generic]';
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
    console.error('🚨 FALLBACK TRIGGERED: continueConversation failed completely, using emergency fallback', error);
    
    // Emergency fallback when everything fails
    const emergencyResponse = generateBetterContextualFollowUp(userResponse, currentTopic) + ' [FALLBACK: AI conversation failed]';
    
    console.log('📝 Using emergency conversation fallback');
    
    return {
      analysis: `[FALLBACK] Unable to analyze response due to AI error, but continuing conversation.`,
      feedbackPoints: ['AI analysis temporarily unavailable', 'Your response was received', 'Let\'s continue the conversation'],
      followUpQuestion: emergencyResponse,
      rawAiResponseText: `FALLBACK_RESPONSE: Conversation AI failed. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
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
    const parsed = parseStructuredResponse(rawAiResponseText);

    // Validate question quality and topic uniqueness
    if (!parsed.questionText || parsed.questionText.length < 15) {
      console.warn('🚨 FALLBACK TRIGGERED: AI question text insufficient, using smart fallback');
      console.log(`📝 Original AI question: "${parsed.questionText}"`);
      parsed.questionText = generateFallbackQuestion(jdResumeText, coveredTopics) + ' [FALLBACK: AI question insufficient]';
    }

    if (parsed.keyPoints.length < 3) {
      console.warn('🚨 FALLBACK TRIGGERED: AI key points insufficient, supplementing with fallbacks');
      console.log(`📝 Original key points count: ${parsed.keyPoints.length}`);
      parsed.keyPoints = [
        ...parsed.keyPoints,
        ...getFallbackKeyPoints(parsed.questionText).slice(0, 4 - parsed.keyPoints.length)
      ];
      console.log('📝 Enhanced key points with fallbacks');
    }

    return {
      questionText: parsed.questionText,
      keyPoints: parsed.keyPoints,
      rawAiResponseText: rawAiResponseText,
    };

  } catch (error) {
    console.error('🚨 FALLBACK TRIGGERED: getNewTopicalQuestion failed completely, using emergency fallback', error);
    
    // Emergency fallback question when AI completely fails
    const emergencyQuestion = generateFallbackQuestion(jdResumeText, coveredTopics) + ' [FALLBACK: AI topic generation failed]';
    const emergencyKeyPoints = getFallbackKeyPoints(emergencyQuestion);
    
    console.log('📝 Using emergency topical question fallback');
    
    return {
      questionText: emergencyQuestion,
      keyPoints: emergencyKeyPoints,
      rawAiResponseText: `FALLBACK_RESPONSE: Topic generation AI failed. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Enhanced helper functions

// Function removed - was unused legacy code

function buildTopicalPrompt(
  jdResumeText: JdResumeText,
  persona: Persona,
  history: MvpSessionTurn[],
  coveredTopics?: string[]
): Content[] {
  const contents: Content[] = [];
  const systemInstructionText = `You are generating new topical interview questions. ${persona.systemPrompt}

CRITICAL INSTRUCTIONS:
- Generate questions about NEW topics not yet covered
- Focus on job description requirements and resume experience
- Avoid repeating previously discussed topics
- Create distinct, focused questions for each topic area
- Provide helpful key points to guide the candidate
- Ensure questions are substantive and interview-appropriate

Your goal is to select the next most important topic to explore based on the job requirements.`;

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

// Functions removed - were unused legacy code

// Function removed - was unused legacy code

function generateFallbackQuestion(jdResumeText: JdResumeText, coveredTopics?: string[]): string {
  console.log('🔄 FALLBACK FUNCTION: generateFallbackQuestion called');
  console.log(`📝 Covered topics: ${coveredTopics?.join(', ') ?? 'none'}`);
  
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
      console.log(`📝 Selected fallback question for keywords: ${fallback.keywords.join(', ')}`);
      return fallback.question;
    }
  }

  console.log('📝 Using generic fallback question (no matching keywords)');
  return 'Tell me about a challenging project you worked on and how you approached solving the key problems.';
}

function getFallbackKeyPoints(questionText: string): string[] {
  console.log('🔄 FALLBACK FUNCTION: getFallbackKeyPoints called');
  console.log(`📝 Question text: "${questionText.substring(0, 50)}..."`);
  
  const questionLower = questionText.toLowerCase();
  
  if (questionLower.includes('backend') || questionLower.includes('node')) {
    console.log('📝 Using backend-specific key points');
    return [
      'Describe specific backend technologies used',
      'Explain API design and architecture decisions',
      'Discuss performance optimization strategies',
      'Share challenges with scalability or data management'
    ];
  }
  
  if (questionLower.includes('team') || questionLower.includes('leadership')) {
    console.log('📝 Using team/leadership-specific key points');
    return [
      'Describe your role and responsibilities',
      'Explain how you handle team collaboration',
      'Discuss mentoring or coaching experience',
      'Share examples of conflict resolution'
    ];
  }
  
  if (questionLower.includes('system') || questionLower.includes('design')) {
    console.log('📝 Using system design-specific key points');
    return [
      'Explain your design process and methodology',
      'Discuss trade-offs and decision criteria',
      'Describe how you handle scalability requirements',
      'Share examples of architectural challenges'
    ];
  }
  
  console.log('📝 Using generic fallback key points');
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

// Helper function to safely get a random item from array
function getRandomFollowUp(followUps: string[]): string {
  if (followUps.length === 0) return "Could you tell me more about that?";
  const randomIndex = Math.floor(Math.random() * followUps.length);
  return followUps[randomIndex]!; // Non-null assertion since we checked length
}

function generateBetterContextualFollowUp(
  userResponse: string,
  currentTopic?: string
): string {
  console.log('🔄 FALLBACK FUNCTION: generateBetterContextualFollowUp called');
  console.log(`📝 User response: "${userResponse.substring(0, 50)}..."`);
  console.log(`📝 Current topic: ${currentTopic ?? 'none'}`);
  
  const response = userResponse.toLowerCase();
  
  // Analyze user response for specific concepts to ask about
  if (response.includes('graduated') || response.includes('degree') || response.includes('university')) {
    console.log('📝 Detected education/graduation context, using academic follow-ups');
    const followUps = [
      "What skills from your studies are you most excited to apply in a professional setting?",
      "How did your academic projects prepare you for real-world challenges?",
      "What specific courses or experiences shaped your career interests?",
      "Which professors or projects had the biggest impact on your learning?"
    ];
    return getRandomFollowUp(followUps);
  }

  if (response.includes('mentor') || response.includes('junior') || response.includes('code review')) {
    console.log('📝 Detected mentoring/leadership context, using mentoring follow-ups');
    const followUps = [
      "What's your approach when a junior developer disagrees with your feedback?",
      "How do you balance being supportive with maintaining code quality standards?",
      "What's the most challenging mentoring situation you've handled?",
      "How do you help junior developers grow beyond just fixing their code?"
    ];
    return getRandomFollowUp(followUps);
  }

  if (response.includes('party') || response.includes('fun') || response.includes('social')) {
    console.log('📝 Detected social/culture context, using work-life balance follow-ups');
    const followUps = [
      "How do you balance having fun with getting things done when working on projects?",
      "What role does team culture and social interaction play in your ideal workplace?",
      "How do you think your social skills contribute to team collaboration?",
      "What does work-life balance mean to you?"
    ];
    return getRandomFollowUp(followUps);
  }

  if (response.includes('project') || response.includes('built') || response.includes('developed')) {
    console.log('📝 Detected project/development context, using project follow-ups');
    const followUps = [
      "What was the most unexpected challenge you encountered in that project?",
      "How did you decide on the technical approach you used?",
      "What would you change about your approach if you were starting over?",
      "What's the most valuable lesson you learned from that experience?"
    ];
    return getRandomFollowUp(followUps);
  }

  // Topic-specific intelligent questions
  if (currentTopic?.toLowerCase().includes('team')) {
    console.log('📝 Using team-specific topic follow-ups');
    const followUps = [
      "Tell me about a time when you had to convince teammates to try a different approach.",
      "How do you handle situations where team members have conflicting ideas?",
      "What's your strategy for building trust with new team members?",
      "Describe how you've contributed to improving team processes."
    ];
    return getRandomFollowUp(followUps);
  }

  if (currentTopic?.toLowerCase().includes('technical') || currentTopic?.toLowerCase().includes('react')) {
    console.log('📝 Using technical-specific topic follow-ups');
    const followUps = [
      "Walk me through how you approach debugging a complex technical issue.",
      "What's your process for staying current with new technologies?",
      "How do you balance writing clean code with meeting deadlines?",
      "Tell me about a technical decision you're particularly proud of."
    ];
    return getRandomFollowUp(followUps);
  }

  // Smart fallbacks based on response length and content
  if (response.length < 20) {
    console.log('📝 Using short response follow-ups (response too brief)');
    const shortResponseFollowUps = [
      "Could you paint me a clearer picture of that situation?",
      "What context would help me understand that better?",
      "I'd love to hear more specifics about what that looked like.",
      "Can you walk me through what actually happened there?"
    ];
    return getRandomFollowUp(shortResponseFollowUps);
  }

  // Thoughtful generic fallbacks (much better than the old ones)
  console.log('📝 Using smart generic fallbacks (no specific context detected)');
  const smartGenericFollowUps = [
    "What made that experience particularly meaningful to you?",
    "How has that shaped your professional perspective?",
    "What surprised you most about that situation?",
    "What skills did you develop through that experience?"
  ];
  
  return getRandomFollowUp(smartGenericFollowUps);
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