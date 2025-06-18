/**
 * SimpleAudioExample.tsx
 * ----------------------
 * Direct React port of the working example.tsx - single button, live audio
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';

// Utility functions from example.tsx
const createBlob = (pcmData: Float32Array): Blob => {
  const arrayBuffer = new ArrayBuffer(pcmData.length * 2);
  const view = new DataView(arrayBuffer);
  
  for (let i = 0; i < pcmData.length; i++) {
    const sample = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(i * 2, sample * 0x7FFF, true);
  }
  
  return new Blob([arrayBuffer], { type: 'audio/pcm' });
};

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
  const audioBuffer = audioContext.createBuffer(channels, arrayBuffer.byteLength / 2, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  const view = new DataView(arrayBuffer);
  
  for (let i = 0; i < channelData.length; i++) {
    channelData[i] = view.getInt16(i * 2, true) / 0x7FFF;
  }
  
  return audioBuffer;
};

const SimpleAudioExample: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // Recreate the exact same structure as the working example
  const clientRef = useRef<GoogleGenAI>();
  const sessionRef = useRef<Session>();
  
  // Audio contexts created immediately (like the example)
  const inputAudioContextRef = useRef<AudioContext>();
  const outputAudioContextRef = useRef<AudioContext>();
  const inputNodeRef = useRef<GainNode>();
  const outputNodeRef = useRef<GainNode>();
  const nextStartTimeRef = useRef(0);
  
  const mediaStreamRef = useRef<MediaStream>();
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode>();
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode>();
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const updateStatus = (msg: string) => {
    console.log(`[SimpleAudio] ${msg}`);
    setStatus(msg);
  };

  const updateError = (msg: string) => {
    console.error(`[SimpleAudio] ${msg}`);
    setError(msg);
  };

  // Initialize audio contexts (like constructor in example)
  const initAudio = () => {
    inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000
    });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000
    });
    
    // Create gain nodes like the example
    inputNodeRef.current = inputAudioContextRef.current.createGain();
    outputNodeRef.current = outputAudioContextRef.current.createGain();
    
    nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
  };

  // Initialize client (like initClient in example)
  const initClient = () => {
    initAudio();

    clientRef.current = new GoogleGenAI({
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!, // Using Next.js env var
    });

    // Connect output like the example
    outputNodeRef.current!.connect(outputAudioContextRef.current!.destination);

    initSession();
  };

  // Initialize session (exact copy from example)
  const initSession = async () => {
    const model = 'gemini-2.5-flash-preview-native-audio-dialog';

    console.log('[SimpleAudio] Starting session initialization...');
    console.log('[SimpleAudio] API Key available:', !!process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    console.log('[SimpleAudio] Model:', model);

    try {
      console.log('[SimpleAudio] Attempting to connect...');
      const session = await clientRef.current!.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            updateStatus('Opened');
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log('[SimpleAudio] Received message:', message);
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;

            if (audio) {
              nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputAudioContextRef.current!.currentTime,
              );

              const audioBuffer = await decodeAudioData(
                decode(audio.data),
                outputAudioContextRef.current!,
                24000,
                1,
              );
              const source = outputAudioContextRef.current!.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current!);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
              sourcesRef.current.add(source);
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
            updateError(e.message);
          },
          onclose: (e: CloseEvent) => {
            updateStatus('Close:' + e.reason);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are doing a mock interview as the interviewer. You are asking the candidate questions and they are answering. You are not the candidate.",
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
          },
        },
      });
      
      sessionRef.current = session;
      console.log('[SimpleAudio] Session successfully stored in ref');
    } catch (e) {
      console.error('[SimpleAudio] Session connection failed:', e);
      updateError(String(e));
    }
  };

  // Start recording (exact copy from example)
  const startRecording = async () => {
    if (isRecording) {
      return;
    }

    inputAudioContextRef.current!.resume();

    updateStatus('Requesting microphone access...');

    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      updateStatus('Microphone access granted. Starting capture...');

      sourceNodeRef.current = inputAudioContextRef.current!.createMediaStreamSource(
        mediaStreamRef.current,
      );
      sourceNodeRef.current.connect(inputNodeRef.current!);

      const bufferSize = 256;
      scriptProcessorNodeRef.current = inputAudioContextRef.current!.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      scriptProcessorNodeRef.current.onaudioprocess = (audioProcessingEvent) => {
        if (!isRecording) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        // Log ALL audio processing (even silence) to debug
        const maxAmplitude = Math.max(...pcmData.map(Math.abs));
        console.log('[SimpleAudio] Audio chunk - max amplitude:', maxAmplitude);

        // Check if there's actual audio (not just silence)
        const hasAudio = pcmData.some(sample => Math.abs(sample) > 0.01);
        if (hasAudio) {
          console.log('[SimpleAudio] 🎤 AUDIO DETECTED! Sending to Gemini...');
        }

        sessionRef.current!.sendRealtimeInput({ media: createBlob(pcmData) });
      };

      sourceNodeRef.current.connect(scriptProcessorNodeRef.current);
      scriptProcessorNodeRef.current.connect(inputAudioContextRef.current!.destination);

      setIsRecording(true);
      updateStatus('🔴 Recording... Capturing PCM chunks.');
    } catch (err) {
      console.error('Error starting recording:', err);
      updateStatus(`Error: ${(err as Error).message}`);
      stopRecording();
    }
  };

  // Stop recording (exact copy from example)
  const stopRecording = () => {
    if (!isRecording && !mediaStreamRef.current && !inputAudioContextRef.current)
      return;

    updateStatus('Stopping recording...');

    setIsRecording(false);

    if (scriptProcessorNodeRef.current && sourceNodeRef.current && inputAudioContextRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }

    scriptProcessorNodeRef.current = undefined;
    sourceNodeRef.current = undefined;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = undefined;
    }

    updateStatus('Recording stopped. Click Start to begin again.');
  };

  // Reset (exact copy from example)
  const reset = () => {
    sessionRef.current?.close();
    initSession();
    updateStatus('Session cleared.');
  };

  // Initialize on mount (like constructor)
  useEffect(() => {
    initClient();
    
    return () => {
      stopRecording();
      sessionRef.current?.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">🎤 Simple Live Audio Interview</h1>
        <p className="text-gray-400">Direct port of working example.tsx</p>
        
        {/* Status */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="text-sm text-gray-500">Status:</div>
          <div className="font-mono">{status}</div>
          {error && <div className="text-red-500 mt-2">{error}</div>}
        </div>

        {/* Single button like the example */}
        <div className="space-y-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!sessionRef.current}
            className={`w-16 h-16 rounded-full border-2 border-white/20 transition-colors ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-white/10 hover:bg-white/20'
            } disabled:opacity-50`}
          >
            {isRecording ? '⏹️' : '🔴'}
          </button>
          
          <button
            onClick={reset}
            disabled={isRecording}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg disabled:opacity-50"
          >
            🔄 Reset
          </button>
        </div>

        <div className="text-xs text-gray-500 max-w-md">
          <p>Click the red button to start recording. The AI will interview you in real-time.</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleAudioExample; 