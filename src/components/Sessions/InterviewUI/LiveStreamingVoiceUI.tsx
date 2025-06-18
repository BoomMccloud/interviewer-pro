/**
 * LiveStreamingVoiceUI.tsx
 * -------------------------
 * Live streaming voice interview with continuous audio input/output
 * Based on Google's example.tsx - single session, real-time streaming
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';

interface LiveStreamingVoiceUIProps {
  sessionId: string;
  onQuestionReceived?: (question: string) => void;
  onResponseSubmitted?: (response: string) => void;
}

const LiveStreamingVoiceUI: React.FC<LiveStreamingVoiceUIProps> = ({
  sessionId,
  onQuestionReceived,
  onResponseSubmitted
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // Audio contexts and nodes
  const inputAudioContextRef = useRef<AudioContext>();
  const outputAudioContextRef = useRef<AudioContext>();
  const mediaStreamRef = useRef<MediaStream>();
  const sourceNodeRef = useRef<MediaStreamSourceNode>();
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode>();
  const sessionRef = useRef<Session>();
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  // Utility functions from example
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

  const updateStatus = (msg: string) => {
    console.log(`[LiveVoice] ${msg}`);
    setStatus(msg);
  };

  const updateError = (msg: string) => {
    console.error(`[LiveVoice] Error: ${msg}`);
    setError(msg);
  };

  // Initialize audio contexts
  const initAudio = () => {
    inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000
    });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000
    });
    nextStartTimeRef.current = outputAudioContextRef.current!.currentTime;
  };

  // Initialize Gemini Live session
  const initSession = async () => {
    try {
      updateStatus('Connecting to Gemini Live...');
      
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      console.log('[LiveVoice] API Key available:', !!apiKey);
      
      if (!apiKey) {
        updateError('GEMINI_API_KEY not found in environment variables');
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const model = 'gemini-2.5-flash-preview-native-audio-dialog';
      
      console.log('[LiveVoice] Attempting to connect with model:', model);

      const session = await ai.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            console.log('[LiveVoice] Session opened callback triggered');
            updateStatus('✅ Live session opened');
            setIsConnected(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log('📨 Received message:', message);
            
            // Handle audio output
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;
            if (audio && outputAudioContextRef.current) {
              try {
                nextStartTimeRef.current = Math.max(
                  nextStartTimeRef.current,
                  outputAudioContextRef.current.currentTime
                );

                const audioBuffer = await decodeAudioData(
                  decode(audio.data),
                  outputAudioContextRef.current,
                  24000,
                  1
                );

                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContextRef.current.destination);
                
                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
                sourcesRef.current.add(source);
                
                updateStatus('🔊 Playing AI response');
              } catch (audioError) {
                console.error('Audio playback error:', audioError);
              }
            }

            // Handle interruptions
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              updateStatus('🛑 AI interrupted, stopping audio');
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }

            // Handle transcriptions
            const transcription = message.serverContent?.outputTranscription?.text;
            if (transcription) {
              updateStatus(`🤖 AI: ${transcription}`);
              onQuestionReceived?.(transcription);
            }
          },
          onerror: (e: ErrorEvent) => {
            updateError(e.message);
            setIsConnected(false);
          },
          onclose: (e: CloseEvent) => {
            updateStatus(`🔒 Session closed: ${e.reason}`);
            setIsConnected(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are conducting a mock interview as the interviewer. Ask thoughtful questions and provide feedback. Keep responses concise and conversational.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } }
          }
        },
      });

      sessionRef.current = session;
      console.log('[LiveVoice] Session stored in ref, connection complete');
      updateStatus('🎯 Ready to start interview');

    } catch (error) {
      console.error('Session init error:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown session error',
        stack: error instanceof Error ? error.stack : undefined
      });
      updateError(error instanceof Error ? error.message : 'Unknown session error');
    }
  };

  // Start recording audio input
  const startRecording = async () => {
    if (isRecording || !inputAudioContextRef.current) return;

    try {
      await inputAudioContextRef.current.resume();
      updateStatus('🎤 Requesting microphone access...');

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      updateStatus('✅ Microphone access granted');

      sourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(
        mediaStreamRef.current
      );

      const bufferSize = 256;
      scriptProcessorNodeRef.current = inputAudioContextRef.current.createScriptProcessor(
        bufferSize,
        1,
        1
      );

      scriptProcessorNodeRef.current.onaudioprocess = (audioProcessingEvent) => {
        if (!isRecording || !sessionRef.current) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        // Send real-time audio to Gemini
        sessionRef.current.sendRealtimeInput({ media: createBlob(pcmData) });
      };

      sourceNodeRef.current.connect(scriptProcessorNodeRef.current);
      scriptProcessorNodeRef.current.connect(inputAudioContextRef.current.destination);

      setIsRecording(true);
      updateStatus('🔴 Recording... Speak now!');

    } catch (err) {
      console.error('Recording error:', err);
      updateError(err instanceof Error ? err.message : 'Recording failed');
      stopRecording();
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (!isRecording) return;

    updateStatus('⏹️ Stopping recording...');
    setIsRecording(false);

    if (scriptProcessorNodeRef.current && sourceNodeRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = undefined;
    }

    scriptProcessorNodeRef.current = undefined;
    sourceNodeRef.current = undefined;

    updateStatus('⏸️ Recording stopped');
  };

  // Reset session
  const resetSession = () => {
    stopRecording();
    sessionRef.current?.close();
    
    // Clear audio sources
    for (const source of sourcesRef.current.values()) {
      source.stop();
      sourcesRef.current.delete(source);
    }
    
    setIsConnected(false);
    initSession();
  };

  // Initialize on mount
  useEffect(() => {
    console.log('[LiveVoice] Component mounted, initializing...');
    initAudio();
    initSession();

    return () => {
      console.log('[LiveVoice] Component unmounting, cleaning up...');
      stopRecording();
      sessionRef.current?.close();
      inputAudioContextRef.current?.close();
      outputAudioContextRef.current?.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          🎤 Live Voice Interview
        </h2>

        {/* Status Display */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">Status:</div>
          <div className="font-mono text-sm">{status}</div>
          {error && (
            <div className="mt-2 text-red-600 text-sm">{error}</div>
          )}
        </div>

        {/* Connection Status */}
        <div className="mb-6 flex items-center justify-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium">
            {isConnected ? 'Connected to Gemini Live' : 'Disconnected'}
          </span>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isConnected}
            className={`w-full py-4 px-6 rounded-lg font-medium transition-colors ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300'
            }`}
          >
            {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
          </button>

          <button
            onClick={resetSession}
            disabled={isRecording}
            className="w-full py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300"
          >
            🔄 Reset Session
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>• Click "Start Recording" to begin the live voice interview</p>
          <p>• The AI will ask questions and respond in real-time</p>
          <p>• Click "Stop Recording" to pause your input</p>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamingVoiceUI; 