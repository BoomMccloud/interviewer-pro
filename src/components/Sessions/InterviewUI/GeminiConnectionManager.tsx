import React, { useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Session, LiveServerMessage, Modality } from '@google/genai';

// Audio utilities for playback
const decode = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const decodeAudioData = async (
  arrayBuffer: ArrayBuffer,
  audioContext: AudioContext,
  sampleRate: number,
  channels: number
): Promise<AudioBuffer> => {
  const audioBuffer = audioContext.createBuffer(
    channels,
    arrayBuffer.byteLength / (channels * 2),
    sampleRate
  );

  const view = new Int16Array(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < channelData.length; i++) {
    channelData[i] = view[i] / 32768.0;
  }

  return audioBuffer;
};

interface GeminiConnectionManagerProps {
  onStatusUpdate: (status: string) => void;
  onError: (error: string) => void;
  onConnectionReady: (sendAudio: (audioBlob: Blob) => void) => void;
}

export const GeminiConnectionManager: React.FC<GeminiConnectionManagerProps> = ({
  onStatusUpdate,
  onError,
  onConnectionReady,
}) => {
  const clientRef = useRef<GoogleGenAI>();
  const sessionRef = useRef<Session>();
  const outputAudioContextRef = useRef<AudioContext>();
  const outputNodeRef = useRef<GainNode>();
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Initialize audio output
  const initializeAudioOutput = useCallback(async () => {
    try {
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);
      nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
      
      onStatusUpdate('✅ Audio output initialized');
      return true;
    } catch (err) {
      onError(`Audio output initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    }
  }, [onStatusUpdate, onError]);

  // Initialize Gemini client
  const initializeClient = useCallback(async () => {
    try {
      clientRef.current = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
      });
      
      onStatusUpdate('✅ Gemini client initialized');
      return true;
    } catch (err) {
      onError(`Client initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    }
  }, [onStatusUpdate, onError]);

  // Create session
  const createSession = useCallback(async () => {
    if (!clientRef.current) {
      onError('Client not initialized');
      return false;
    }

    try {
      onStatusUpdate('🔌 Connecting to Gemini Live...');
      
      const session = await clientRef.current.live.connect({
        model: 'gemini-2.5-flash-preview-native-audio-dialog',
        callbacks: {
          onopen: () => {
            onStatusUpdate('✅ Gemini Live session opened');
          },
          onmessage: (message: LiveServerMessage) => {
            console.log('[GeminiConnection] Received message:', message);
            
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;
            if (audio && outputAudioContextRef.current && outputNodeRef.current) {
              nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputAudioContextRef.current.currentTime,
              );

              void (async () => {
                if (!outputAudioContextRef.current || !outputNodeRef.current) return;
                
                const audioBuffer = await decodeAudioData(
                  decode(audio.data),
                  outputAudioContextRef.current,
                  24000,
                  1,
                );
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNodeRef.current);
                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
                sourcesRef.current.add(source);
                
                onStatusUpdate('🔊 Playing AI response');
              })();
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            onError(`Session error: ${e.message}`);
          },
          onclose: (e: CloseEvent) => {
            onStatusUpdate(`Session closed: ${e.reason}`);
            sessionRef.current = undefined;
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are conducting a mock interview as the interviewer. Ask thoughtful questions and provide feedback. Keep responses concise.",
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
          },
        },
      });
      
      sessionRef.current = session;
      
      // Provide the sendAudio function to parent
      const sendAudio = (audioBlob: Blob) => {
        if (sessionRef.current) {
          try {
            sessionRef.current.sendRealtimeInput({ media: audioBlob });
          } catch (err) {
            onError(`Failed to send audio: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      };
      
      onConnectionReady(sendAudio);
      onStatusUpdate('🎯 Ready for voice interview');
      return true;
    } catch (err) {
      onError(`Session creation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    }
  }, [onStatusUpdate, onError, onConnectionReady]);

  // Close session
  const closeSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = undefined;
      onStatusUpdate('Session closed');
    }
  }, [onStatusUpdate]);

  // Reset session
  const resetSession = useCallback(async () => {
    closeSession();
    await createSession();
  }, [closeSession, createSession]);

  // Initialize everything on mount
  useEffect(() => {
    const initialize = async () => {
      await initializeAudioOutput();
      await initializeClient();
      // Don't create session automatically - wait for user action
      // Provide the createSession function to parent instead
      const sendAudio = (audioBlob: Blob) => {
        if (sessionRef.current) {
          try {
            sessionRef.current.sendRealtimeInput({ media: audioBlob });
          } catch (err) {
            onError(`Failed to send audio: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      };
      
      // Create session when called, not immediately
      const createSessionAndProvideCallback = async () => {
        const success = await createSession();
        return success;
      };
      
      // Provide both the sendAudio function and session creator
      onConnectionReady(sendAudio);
    };
    
    void initialize();
    
    return () => {
      closeSession();
    };
  }, [initializeAudioOutput, initializeClient, closeSession, createSession, onConnectionReady, onError]);

  // Expose methods to parent component
  useEffect(() => {
    // We could expose resetSession via a ref or callback if needed
  }, [resetSession]);

  // This component doesn't render anything - it's purely functional
  return null;
};

export default GeminiConnectionManager; 