// src/lib/gemini-voice-proposal.ts
// 🎯 PROPOSAL: Adding Voice Support to Existing Gemini Integration

import { GoogleGenAI } from '@google/genai';
import type { JdResumeText, Persona, MvpSessionTurn } from '../types';

// 🔧 OPTION 1: Hybrid Approach (Recommended)
// Keep topic generation text-only, add voice for conversation

interface VoiceConversationResponse {
  analysis: string;
  feedbackPoints: string[];
  followUpQuestion: string;
  audioResponse?: Blob; // Voice output
  rawAiResponseText: string;
}

interface ConversationModality {
  input: 'text' | 'voice';
  output: 'text' | 'voice';
}

// 🎙️ NEW: Voice-enabled conversation function
export async function continueConversationWithVoice(
  jdResumeText: JdResumeText,
  persona: Persona,
  history: MvpSessionTurn[],
  userInput: string | Blob, // Text or audio
  modality: ConversationModality
): Promise<VoiceConversationResponse> {
  
  const MODEL_VOICE = 'gemini-2.5-flash-preview-native-audio-dialog';
  const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
  
  try {
    if (modality.input === 'voice' && modality.output === 'voice') {
      // 🔄 Native voice-to-voice using Live API or Native Audio
      const response = await genAI.models.generateContentStream({
        model: MODEL_VOICE,
        contents: buildVoicePrompt(jdResumeText, persona, history, userInput),
        config: {
          temperature: 0.8,
          maxOutputTokens: 400,
          responseModalities: ['AUDIO', 'TEXT']
        }
      });
      
      return processVoiceResponse(response);
    } 
    else if (modality.input === 'text' && modality.output === 'voice') {
      // 📝➡️🎙️ Text input, voice output
      const textResponse = await continueConversation(
        jdResumeText, persona, history, userInput as string
      );
      
      const audioBlob = await generateSpeech(textResponse.followUpQuestion);
      
      return {
        ...textResponse,
        audioResponse: audioBlob
      };
    }
    else {
      // 📝 Fallback to existing text-only function
      return await continueConversation(
        jdResumeText, persona, history, userInput as string
      );
    }
  } catch (error) {
    console.error('Voice conversation error:', error);
    // Graceful fallback to text
    return await continueConversation(
      jdResumeText, persona, history, 
      typeof userInput === 'string' ? userInput : '[Voice input conversion failed]'
    );
  }
}

// 🎙️ HELPER: Generate speech from text
async function generateSpeech(text: string): Promise<Blob> {
  const response = await genAI.models.generateContentStream({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: 'Aoede' // Professional female voice
          }
        }
      }
    }
  });
  
  return await processAudioStream(response);
}

// 🔧 OPTION 2: Extended tRPC Procedures
// Add voice-specific procedures while keeping existing ones

export const voiceSessionRouter = {
  // ✅ EXISTING: Keep all current procedures unchanged
  startInterviewSession: protectedProcedure
    .input(z.object({ sessionId: z.string(), personaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Keep existing text-only topic generation
      const aiResponse = await getFirstQuestion(jdResumeText, persona);
      // ... existing logic
    }),

  // 🆕 NEW: Voice conversation procedure  
  submitVoiceResponse: protectedProcedure
    .input(z.object({ 
      sessionId: z.string(), 
      audioData: z.string(), // base64 encoded
      modality: z.object({
        input: z.enum(['text', 'voice']),
        output: z.enum(['text', 'voice'])
      })
    }))
    .mutation(async ({ ctx, input }) => {
      const audioBlob = base64ToBlob(input.audioData);
      
      const aiResponse = await continueConversationWithVoice(
        session.jdResumeText,
        persona,
        conversationHistory,
        audioBlob,
        input.modality
      );
      
      return {
        conversationResponse: aiResponse.followUpQuestion,
        audioResponse: aiResponse.audioResponse ? blobToBase64(aiResponse.audioResponse) : null,
        // ... other fields
      };
    }),

  // ✅ EXISTING: Keep unchanged
  getNextTopicalQuestion: protectedProcedure
    .mutation(async ({ ctx, input }) => {
      // Keep existing text-only topic generation
      const aiResponse = await getNewTopicalQuestion(...);
      // ... existing logic
    })
};

// 🎨 OPTION 3: Frontend Integration
// Update UI components to support voice

interface VoiceInterviewUIProps {
  modality: 'text' | 'voice';
  onModalityChange: (modality: 'text' | 'voice') => void;
  onVoiceInput: (audioBlob: Blob) => Promise<void>;
  sessionData: any; // Define proper type based on your TextInterviewUI props
}

export function InterviewUI({ sessionData, modality, ...props }: VoiceInterviewUIProps) {
  if (modality === 'voice') {
    // Return VoiceInterviewUI component here
    return null; // Placeholder - implement VoiceInterviewUI
  }
  
  // Return TextInterviewUI component here  
  return null; // Placeholder - implement based on existing TextInterviewUI
}

// 📊 COMPARISON: Implementation Options

/**
 * OPTION 1: Hybrid Approach (RECOMMENDED)
 * ✅ Minimal changes to existing code
 * ✅ Topic generation stays simple (text-only)
 * ✅ Voice only where valuable (conversation)
 * ✅ Graceful fallback to text
 * ✅ Cost-effective (text cheaper for topics)
 * 
 * OPTION 2: Live API Integration  
 * ⚠️ More complex WebSocket implementation
 * ⚠️ Real-time streaming requirements
 * ✅ Lowest latency voice experience
 * ⚠️ Higher complexity for session management
 * 
 * OPTION 3: Text-to-Speech Pipeline
 * ✅ Simple implementation
 * ⚠️ Higher latency (text generation + TTS)
 * ✅ More control over audio quality
 * ✅ Works with existing text functions
 */

// 🎯 RECOMMENDED IMPLEMENTATION PLAN

/**
 * PHASE 1: Add TTS Support (Easiest Win)
 * 1. Keep all existing functions unchanged
 * 2. Add generateSpeech() helper function  
 * 3. Update frontend to play audio responses
 * 4. Add voice/text toggle in UI
 * 
 * PHASE 2: Add Voice Input (Speech-to-Text)
 * 1. Add audio recording in frontend
 * 2. Convert voice to text before sending to existing functions
 * 3. No backend changes needed
 * 
 * PHASE 3: Native Voice (Optional Enhancement)
 * 1. Implement continueConversationWithVoice()
 * 2. Add voice-specific tRPC procedures
 * 3. Use Gemini native audio models
 */

// 💰 COST CONSIDERATIONS
/**
 * TEXT GENERATION (Current):
 * - Input: ~$0.10/M tokens
 * - Output: ~$0.40/M tokens
 * 
 * VOICE GENERATION (New):
 * - Native Audio: Higher cost per interaction
 * - TTS: Additional cost per character
 * - Recommendation: Let users choose modality
 */

export const VOICE_IMPLEMENTATION_SUMMARY = {
  recommended: "Hybrid Approach",
  reasoning: [
    "Minimal changes to existing codebase",
    "Topic generation stays cost-effective",
    "Voice adds value in conversation",
    "Graceful fallback to text",
    "Incremental implementation possible"
  ],
  timeline: "2-3 weeks for basic voice support",
  complexity: "Low to Medium"
} as const; 