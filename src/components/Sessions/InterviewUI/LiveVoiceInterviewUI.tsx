/**
 * LiveVoiceInterviewUI Component
 * 
 * Combined implementation featuring:
 * - Beautiful UI from original LiveVoiceInterviewUI
 * - Working AudioWorklet implementation from ImprovedAudioWorkletExample
 * - Real-time Gemini Live API integration with proper audio format
 * - Professional audio buffering and processing
 */

'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleGenAI, Modality, type LiveSendRealtimeInputParameters } from '@google/genai';
import Timer from '~/components/UI/Timer';

// Type guards for Gemini Live API responses
interface GeminiAudioPart {
  inlineData?: {
    data: string;
    mimeType: string;
  };
  text?: string;
}

interface GeminiMessage {
  serverContent?: {
    modelTurn?: {
      parts?: GeminiAudioPart[];
    };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
  message?: string;
}

const isValidGeminiMessage = (message: unknown): message is GeminiMessage => {
  return typeof message === 'object' && message !== null;
};

const hasAudioPart = (part: unknown): part is GeminiAudioPart => {
  if (typeof part !== 'object' || part === null || !('inlineData' in part)) {
    return false;
  }
  const partObj = part as Record<string, unknown>;
  const inlineData = partObj.inlineData;
  
  return typeof inlineData === 'object' && 
         inlineData !== null &&
         'data' in inlineData &&
         'mimeType' in inlineData &&
         typeof (inlineData as Record<string, unknown>).data === 'string' &&
         typeof (inlineData as Record<string, unknown>).mimeType === 'string';
};

const hasTextPart = (part: unknown): part is { text: string } => {
  if (typeof part !== 'object' || part === null || !('text' in part)) {
    return false;
  }
  const partObj = part as Record<string, unknown>;
  return typeof partObj.text === 'string';
};

interface LiveVoiceInterviewUIProps {
  sessionData: {
    sessionId: string;
    personaId: string;
    personaName?: string;
    currentQuestion: string;
    timeRemaining: number;
    startTime: Date | null;
  };
  currentQuestion: string;
  onEnd: () => Promise<void>;
}

type UIState = 'waiting_to_start' | 'loading' | 'interviewing' | 'error' | 'completed';

// Helper function to convert Float32Array to base64 PCM (official format)
const convertToBase64PCM = (pcmData: Float32Array): string => {
  // Convert Float32Array to Int16Array for PCM 16-bit
  const int16Data = new Int16Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    const sample = pcmData[i];
    if (sample !== undefined) {
      int16Data[i] = Math.max(-32768, Math.min(32767, sample * 32768));
    }
  }
  
  // Convert to base64 like the official demo
  const buffer = new Uint8Array(int16Data.buffer);
  let binary = '';
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

export default function LiveVoiceInterviewUI({
  sessionData,
  currentQuestion,
  onEnd,
}: LiveVoiceInterviewUIProps) {
  const [uiState, setUIState] = useState<UIState>('waiting_to_start');
  const [error, setError] = useState<string | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const router = useRouter();

  // Audio and Gemini refs
  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<{ sendRealtimeInput: (input: LiveSendRealtimeInputParameters) => void; close: () => void } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recorderNodeRef = useRef<AudioWorkletNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<AudioWorkletNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Initialize client AND session immediately (like working example)
  const initClient = async () => {
    await initAudio();

    clientRef.current = new GoogleGenAI({
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
    });

    if (outputNodeRef.current && outputAudioContextRef.current) {
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);
    }

    // Create session immediately like working example
    setUIState('loading');
    await initSession();
    setUIState('interviewing');
  };

  const initAudio = async () => {
    try {
      // Input audio context for recording
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      await audioContextRef.current.audioWorklet.addModule('/improved-audio-worklet.js');

      // Output audio context for playback
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      await outputAudioContextRef.current.audioWorklet.addModule('/improved-audio-worklet.js');

      // Create output node for AI audio
      outputNodeRef.current = new AudioWorkletNode(
        outputAudioContextRef.current,
        'improved-audio-worklet'
      );

      // Initialize audio scheduling
      nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
    } catch (err) {
      console.error('Failed to initialize audio:', err);
      throw new Error('Failed to initialize audio system');
    }
  };

  const initSession = async () => {
    if (!clientRef.current) {
      throw new Error('Client not initialized');
    }

    // Try the official demo model first
    const model = 'gemini-2.0-flash-live-001';

    try {
      sessionRef.current = await clientRef.current.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are doing a mock interview as the interviewer. You are asking the candidate questions and they are answering. You are not the candidate.",
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
          },
        },
        callbacks: {
          onopen: () => {
            console.log('[LiveVoiceUI] ✅ Gemini Live session opened');
          },
          onmessage: (message: unknown) => {
            console.log('[LiveVoiceUI] 📨 Received message:', message);
            
            if (!isValidGeminiMessage(message)) {
              console.warn('[LiveVoiceUI] ⚠️ Invalid message format:', message);
              return;
            }
            
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (hasAudioPart(part) && part.inlineData?.mimeType?.startsWith('audio/')) {
                  setIsAISpeaking(true);
                  // Play AI audio
                  playAudioData(part.inlineData.data);
                }
                if (hasTextPart(part)) {
                  console.log('[LiveVoiceUI] 📝 AI text:', part.text);
                }
              }
            }

            // Handle interruption (like working example)
            if (message.serverContent?.interrupted) {
              console.log('[LiveVoiceUI] 🛑 Audio interrupted, stopping all sources');
              stopAllAudioSources();
            }
            
            if (message.serverContent?.turnComplete) {
              setIsAISpeaking(false);
            }
          },
          onerror: (error: unknown) => {
            console.error('[LiveVoiceUI] ❌ Session error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
            setError('Connection error: ' + errorMessage);
            setUIState('error');
          },
          onclose: (e: CloseEvent) => {
            console.log('[LiveVoiceUI] 🔌 Session closed:', e.reason);
            setUIState('completed');
          },
        },
      });
    } catch (err) {
      console.error('[LiveVoiceUI] ❌ Failed to create session:', err);
      throw err;
    }
  };

  const stopAllAudioSources = () => {
    for (const source of sourcesRef.current.values()) {
      source.stop();
      sourcesRef.current.delete(source);
    }
    if (outputAudioContextRef.current) {
      nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
    }
  };

  const playAudioData = (base64Audio: string) => {
    if (!outputAudioContextRef.current) return;
    
    try {
      // Decode base64 audio data (same as working example)
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Convert PCM 16-bit data to AudioBuffer (proper implementation)
      // Gemini Live API sends PCM data at 24kHz sample rate, 16-bit, mono
      const SAMPLE_RATE = 24000;
      const CHANNELS = 1;
      
      // Convert Uint8Array to Int16Array (PCM 16-bit data)
      const pcm16Data = new Int16Array(bytes.buffer);
      
      // Create AudioBuffer with correct sample count
      const audioBuffer = outputAudioContextRef.current.createBuffer(
        CHANNELS, 
        pcm16Data.length, 
        SAMPLE_RATE
      );
      
      // Convert Int16 PCM to Float32 for AudioBuffer
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcm16Data.length; i++) {
        const sample = pcm16Data[i];
        if (sample !== undefined) {
          channelData[i] = sample / 32768.0; // Convert to -1.0 to 1.0 range
        }
      }
      
      // Schedule audio playback properly (like working example)
      nextStartTimeRef.current = Math.max(
        nextStartTimeRef.current,
        outputAudioContextRef.current.currentTime
      );

      const source = outputAudioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioContextRef.current.destination);
      
      source.addEventListener('ended', () => {
        sourcesRef.current.delete(source);
        setIsAISpeaking(false);
      });

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
      sourcesRef.current.add(source);
    } catch (err) {
      console.error('[LiveVoiceUI] ❌ Failed to play audio:', err);
      setIsAISpeaking(false);
    }
  };

  const startRecording = async () => {
    if (!audioContextRef.current || !sessionRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Create recorder node with 256-sample buffering
      recorderNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        'improved-audio-worklet'
      );

      source.connect(recorderNodeRef.current);
      setIsRecording(true);

      // Set recording parameter to true
      const isRecordingParam = recorderNodeRef.current.parameters.get('isRecording');
      if (isRecordingParam) {
        isRecordingParam.value = 1;
      }

      // Handle buffered audio data
      recorderNodeRef.current.port.onmessage = (event) => {
        // Check session exists (simplified like working example)
        if (!sessionRef.current) return;

        const eventData = event.data as { audioBuffer?: Float32Array };
        const audioBuffer = eventData.audioBuffer;
        if (audioBuffer && audioBuffer.length > 0) {
          // Send buffered data to Gemini using official format
          try {
            // Convert Float32Array to base64 PCM format like official demo
            const base64Audio = convertToBase64PCM(audioBuffer);
            
            sessionRef.current.sendRealtimeInput({
              media: {
                data: base64Audio,
                mimeType: "audio/pcm;rate=16000"
              }
            });
          } catch (err) {
            console.error('[LiveVoiceUI] ❌ Failed to send audio:', err);
          }
        }
      };
    } catch (err) {
      console.error('[LiveVoiceUI] ❌ Failed to start recording:', err);
      setError('Microphone access denied. Please enable microphone permission.');
      setUIState('error');
    }
  };

  const stopRecording = () => {
    if (recorderNodeRef.current && isRecording) {
      const isRecordingParam = recorderNodeRef.current.parameters.get('isRecording');
      if (isRecordingParam) {
        isRecordingParam.value = 0;
      }
      setIsRecording(false);
    }
  };

  // Handler to start the interview (requires user gesture)
  const handleStartInterview = async () => {
    setError(null);
    
    try {
      await initClient();
      await startRecording();
    } catch (err) {
      console.error('Failed to start interview:', err);
      setError('Failed to initialize interview session');
      setUIState('error');
    }
  };

  const handleEndInterview = async () => {
    stopRecording();
    if (sessionRef.current) {
      sessionRef.current.close();
    }
    await onEnd();
    router.push(`/sessions/${sessionData.sessionId}/report`);
  };

  const getStatusMessage = (): string => {
    switch (uiState) {
      case 'waiting_to_start':
        return 'Ready to start your live interview';
      case 'loading':
        return 'Connecting to interview system...';
      case 'interviewing':
        return isAISpeaking ? 'Interviewer is speaking...' : 'Listening to your response...';
      case 'error':
        return 'Connection error occurred';
      case 'completed':
        return 'Interview completed';
      default:
        return 'Starting interview...';
    }
  };

  const getStatusColor = (): string => {
    switch (uiState) {
      case 'waiting_to_start':
        return 'text-blue-600 dark:text-blue-400';
      case 'loading':
        return 'text-blue-600 dark:text-blue-400';
      case 'interviewing':
        return isAISpeaking 
          ? 'text-purple-600 dark:text-purple-400' 
          : 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'completed':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getAvatarState = () => {
    if (uiState === 'waiting_to_start') {
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400';
    }
    if (uiState === 'loading') {
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 animate-pulse';
    }
    if (uiState === 'error') {
      return 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-400';
    }
    if (uiState === 'interviewing') {
      return isAISpeaking
        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 dark:border-purple-400 animate-pulse'
        : 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-400';
    }
    return 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
  };

  const getPersonIconColor = () => {
    if (uiState === 'waiting_to_start') return 'text-blue-500 dark:text-blue-400';
    if (uiState === 'loading') return 'text-blue-500 dark:text-blue-400';
    if (uiState === 'error') return 'text-red-500 dark:text-red-400';
    if (uiState === 'interviewing') {
      return isAISpeaking 
        ? 'text-purple-500 dark:text-purple-400' 
        : 'text-green-500 dark:text-green-400';
    }
    return 'text-gray-400 dark:text-gray-500';
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
      {/* Header - Consistent with TextInterviewUI */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-b border-gray-200 dark:border-gray-600 p-6">
        <div className="w-full flex gap-6">
          {/* Questions and Guidance Container */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-2 h-2 rounded-full ${
                uiState === 'interviewing' ? 'bg-green-500 animate-pulse' : 
                uiState === 'error' ? 'bg-red-500' : 'bg-blue-500 animate-pulse'
              }`}></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Current Question:
              </span>
              {sessionData.personaName && (
                <span className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                  👤 {sessionData.personaName}
                </span>
              )}
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-relaxed mb-4 p-4 bg-gray-50/30 dark:bg-slate-800/30 rounded-lg">
              {currentQuestion || 'Loading next question...'}
            </h2>
            
            {/* AI Guidance Hints - Same as TextInterviewUI */}
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-blue-100 dark:border-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">💡</span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <strong className="text-blue-900 dark:text-blue-400">Key points:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Focus on your specific role and contributions</li>
                    <li>Highlight technologies and tools you used</li>
                    <li>Discuss challenges faced and how you overcame them</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Timer Container */}
          <div className="flex-shrink-0 flex items-center">
            {sessionData.startTime && <Timer />}
          </div>
        </div>
      </div>

      {/* Main Content - Voice Interview Visualization */}
      <div className="flex-1 flex items-center justify-center bg-gray-50/30 dark:bg-slate-800/30 p-8">
        <div className="flex flex-col items-center justify-center text-center max-w-lg">
          
          {/* Live Session Avatar */}
          <div className={`relative w-48 h-48 rounded-full flex items-center justify-center mb-8 transition-all duration-300 border-4 ${getAvatarState()}`}>
            {/* Person Icon */}
            <svg 
              className={`w-24 h-24 transition-colors ${getPersonIconColor()}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
            
            {/* Live indicator */}
            {uiState === 'interviewing' && (
              <div className="absolute -top-2 -right-2 flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-lg border border-gray-200 dark:border-gray-600">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">LIVE</span>
              </div>
            )}
            
            {/* AI Speaking indicator */}
            {isAISpeaking && uiState === 'interviewing' && (
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Consistent with TextInterviewUI */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-600 p-6">
        <div className="w-full">
          {/* Voice Input Section - Different from Text */}
          <div className="space-y-4">
            {/* Voice Mode Status and Controls */}
            {uiState === 'waiting_to_start' && (
              <div className="text-center">
                <button
                  onClick={handleStartInterview}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors shadow-lg hover:shadow-xl"
                >
                  🎙️ Start Interview
                </button>
              </div>
            )}

            {uiState === 'loading' && (
              <div className="text-center">
                <div className="text-blue-600 dark:text-blue-400 font-medium">
                  Initializing your live interview session...
                </div>
              </div>
            )}

            {uiState === 'interviewing' && (
              <div className="text-center">
                <div className={`text-lg font-medium ${getStatusColor()}`}>
                  {getStatusMessage()}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-600 rounded-lg p-4">
                <div className="text-red-700 dark:text-red-400 text-sm text-center">
                  {error}
                </div>
              </div>
            )}
          </div>
          
          {/* Session Controls - Exactly Same as TextInterviewUI */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {uiState === 'waiting_to_start' && "Make sure your microphone is ready before starting"}
              {uiState === 'loading' && "Setting up your interview experience"}
              {uiState === 'interviewing' && "Live conversation mode - speak when ready"}
              {uiState === 'error' && "Please try refreshing the page or contact support"}
              {uiState === 'completed' && "Use clear and specific examples in your responses"}
            </div>
            <div className="flex gap-3">
              {/* Next Question button - same as TextInterviewUI but disabled for voice */}
              <button
                type="button"
                disabled={true}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Next Question
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm border rounded-lg transition-colors text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-50"
                disabled
              >
                Save
              </button>
              <button
                onClick={handleEndInterview}
                disabled={uiState === 'loading'}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uiState === 'loading' ? 'Ending...' : 'End Interview'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 