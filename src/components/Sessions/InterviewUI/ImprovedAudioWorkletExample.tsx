/**
 * ImprovedAudioWorkletExample.tsx
 * --------------------------------
 * Professional AudioWorklet implementation with proper buffering and recording control
 * Based on production-ready patterns
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';

// Utility functions - using the working implementation pattern from geminiLiveInterview.ts

// Helper function to convert Float32Array to base64 PCM (official format)
const convertToBase64PCM = (pcmData: Float32Array): string => {
  // Convert Float32Array to Int16Array for PCM 16-bit
  const int16Data = new Int16Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    int16Data[i] = Math.max(-32768, Math.min(32767, pcmData[i] * 32768));
  }
  
  // Convert to base64 like the official demo
  const buffer = new Uint8Array(int16Data.buffer);
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
};

const createBlob = (pcmData: Float32Array): Blob => {
  // Convert Float32Array to Int16Array like the working example
  const int16Data = new Int16Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    int16Data[i] = Math.max(-32768, Math.min(32767, pcmData[i] * 32768));
  }
  
  // Create blob from the Int16Array buffer
  return new Blob([int16Data.buffer], { type: 'audio/pcm' });
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

// Professional AudioWorklet processor with proper buffering
const improvedAudioWorkletCode = `
class ImprovedRecorderProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'isRecording',
      defaultValue: 0
    }];
  }

  constructor() {
    super();
    this._bufferSize = 256; // Match working example buffer size
    this._buffer = new Float32Array(this._bufferSize);
    this._initBuffer();
  }

  _initBuffer() {
    this._bytesWritten = 0;
  }

  _isBufferEmpty() {
    return this._bytesWritten === 0;
  }

  _isBufferFull() {
    return this._bytesWritten === this._bufferSize;
  }

  _appendToBuffer(value) {
    if (this._isBufferFull()) {
      this._flush();
    }

    this._buffer[this._bytesWritten] = value;
    this._bytesWritten += 1;
  }

  _flush() {
    let buffer = this._buffer;
    if (this._bytesWritten < this._bufferSize) {
      buffer = buffer.slice(0, this._bytesWritten);
    }

    // Calculate amplitude for logging
    const maxAmplitude = Math.max(...buffer.map(Math.abs));

    this.port.postMessage({
      eventType: 'data',
      audioBuffer: buffer,
      amplitude: maxAmplitude
    });

    this._initBuffer();
  }

  _recordingStopped() {
    if (!this._isBufferEmpty()) {
      this._flush(); // Flush remaining data
    }
    
    this.port.postMessage({
      eventType: 'stop'
    });
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const isRecordingValues = parameters.isRecording;
    const inputChannel = input[0];

    // Handle both constant and changing parameter values (per Chrome docs)
    if (isRecordingValues.length === 1) {
      // Constant value for entire render quantum (128 samples)
      const shouldRecord = isRecordingValues[0] === 1;
      
      if (!shouldRecord && !this._isBufferEmpty()) {
        this._flush();
        this._recordingStopped();
      }

      if (shouldRecord) {
        // Process entire buffer at once for efficiency
        for (let i = 0; i < inputChannel.length; i++) {
          this._appendToBuffer(inputChannel[i]);
        }
      }
    } else {
      // Parameter changes during render quantum - handle per sample
      for (let dataIndex = 0; dataIndex < isRecordingValues.length; dataIndex++) {
        const shouldRecord = isRecordingValues[dataIndex] === 1;
        
        if (!shouldRecord && !this._isBufferEmpty()) {
          this._flush();
          this._recordingStopped();
        }

        if (shouldRecord && dataIndex < inputChannel.length) {
          this._appendToBuffer(inputChannel[dataIndex]);
        }
      }
    }

    return true;
  }
}

registerProcessor('improved-recorder-worklet', ImprovedRecorderProcessor);
`;

const ImprovedAudioWorkletExample: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const clientRef = useRef<GoogleGenAI>();
  const sessionRef = useRef<Session>();
  const isSessionConnectedRef = useRef(false); // Track session connection state
  
  const inputAudioContextRef = useRef<AudioContext>();
  const outputAudioContextRef = useRef<AudioContext>();
  const outputNodeRef = useRef<GainNode>();
  const nextStartTimeRef = useRef(0);
  
  const mediaStreamRef = useRef<MediaStream>();
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode>();
  const recorderNodeRef = useRef<AudioWorkletNode>();
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const updateStatus = (msg: string) => {
    console.log(`[ImprovedAudioWorklet] ${msg}`);
    setStatus(msg);
  };

  const updateError = (msg: string) => {
    console.error(`[ImprovedAudioWorklet] ${msg}`);
    setError(msg);
  };

  // Initialize audio contexts
  const initAudio = async () => {
    try {
      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      if (outputAudioContextRef.current) {
        outputNodeRef.current = outputAudioContextRef.current.createGain();
        nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
      }

      // Create AudioWorklet with improved processor
      const blob = new Blob([improvedAudioWorkletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      if (inputAudioContextRef.current) {
        await inputAudioContextRef.current.audioWorklet.addModule(workletUrl);
        updateStatus('✅ Improved AudioWorklet loaded');
      }
      
      URL.revokeObjectURL(workletUrl); // Clean up
      
    } catch (err) {
      console.error('Audio initialization failed:', err);
      updateError(`Audio init failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

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
    await initSession();
  };

  // Initialize session (with guard against duplicate creation)
  const initSession = async () => {
    console.log('[ImprovedAudioWorklet] 🔍 initSession called, current session:', sessionRef.current ? 'EXISTS' : 'NULL');
    
    // Prevent duplicate session creation
    if (sessionRef.current) {
      console.log('[ImprovedAudioWorklet] ⚠️ Session already exists, skipping creation');
      return;
    }

    // Try the official demo model first
    const model = 'gemini-2.0-flash-live-001';

    console.log('[ImprovedAudioWorklet] 🚀 Creating new session...');
    updateStatus('🔌 Connecting to Gemini Live...');

    try {
      if (!clientRef.current) return;
      
      const session = await clientRef.current.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            updateStatus('✅ Gemini Live session opened');
          },
          onmessage: (message: LiveServerMessage) => {
            console.log('[ImprovedAudioWorklet] 📨 Received message:', JSON.stringify(message, null, 2));
            
            // The working implementation doesn't need setupComplete handling
            
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
                
                updateStatus('🔊 Playing AI response');
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
            console.error('[ImprovedAudioWorklet] 🚨 Session error:', e);
            updateError(e.message);
          },
          onclose: (e: CloseEvent) => {
            updateStatus('Session closed: ' + e.reason);
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
      updateStatus('🎯 Ready for voice interview');
    } catch (e) {
      console.error('[ImprovedAudioWorklet] Session connection failed:', e);
      updateError(String(e));
    }
  };

  // Start recording with improved AudioWorklet (and initialize session like the example)
  const startRecording = async () => {
    if (isRecording || !inputAudioContextRef.current || !clientRef.current) return;

    try {
      await inputAudioContextRef.current.resume();
      updateStatus('🎤 Requesting microphone access...');

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });

      updateStatus('✅ Microphone access granted');

      sourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(
        mediaStreamRef.current,
      );

      // Create improved recorder node
      recorderNodeRef.current = new AudioWorkletNode(
        inputAudioContextRef.current,
        'improved-recorder-worklet'
      );

      // Connect audio pipeline FIRST
      sourceNodeRef.current.connect(recorderNodeRef.current);
      recorderNodeRef.current.connect(inputAudioContextRef.current.destination);

      // Set React state FIRST
      setIsRecording(true);
      
      // Handle buffered audio data (set up AFTER state is set)
      recorderNodeRef.current.port.onmessage = (event) => {
        // Check session exists (simplified like working example)
        if (!sessionRef.current) return;

        const { eventType, audioBuffer, amplitude } = event.data as {
          eventType: string;
          audioBuffer: Float32Array;
          amplitude: number;
        };

        if (eventType === 'data') {
          // Log buffered data (much less frequent than before!)
          if (amplitude > 0.001) {
            console.log(`[ImprovedAudioWorklet] 🎵 Buffered audio! Size: ${audioBuffer.length}, Amplitude: ${amplitude.toFixed(4)}`);
          }

          // Send buffered data to Gemini using official format
          try {
            console.log('[ImprovedAudioWorklet] 📤 Sending audio to Gemini...');
            
            // Convert Float32Array to base64 PCM format like official demo
            const base64Audio = convertToBase64PCM(audioBuffer);
            
            sessionRef.current.sendRealtimeInput({
              audio: {
                data: base64Audio,
                mimeType: "audio/pcm;rate=16000"
              }
            });
            console.log('[ImprovedAudioWorklet] ✅ Audio sent successfully');
          } catch (err) {
            console.error('[ImprovedAudioWorklet] ❌ Failed to send audio:', err);
          }
        }

        if (eventType === 'stop') {
          console.log('[ImprovedAudioWorklet] 🛑 Recording stopped by worklet');
        }
      };
      
      // Start recording using AudioParam (precise timing)
      const isRecordingParam = recorderNodeRef.current.parameters.get('isRecording');
      if (isRecordingParam) {
        isRecordingParam.setValueAtTime(1, inputAudioContextRef.current.currentTime);
      }

      updateStatus('🔴 Recording with Improved AudioWorklet (buffered)...');

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

    // Stop recording using AudioParam
    if (recorderNodeRef.current && inputAudioContextRef.current) {
      const isRecordingParam = recorderNodeRef.current.parameters.get('isRecording');
      if (isRecordingParam) {
        isRecordingParam.setValueAtTime(0, inputAudioContextRef.current.currentTime);
      }
    }

    // Clean up connections
    if (recorderNodeRef.current && sourceNodeRef.current) {
      recorderNodeRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = undefined;
    }

    recorderNodeRef.current = undefined;
    sourceNodeRef.current = undefined;

    updateStatus('⏸️ Recording stopped');
  };

  // Reset session
  const reset = () => {
    sessionRef.current?.close();
    sessionRef.current = undefined; // Clear the reference
    updateStatus('🔄 Session cleared - click microphone to start new session');
  };

  // Initialize on mount
  useEffect(() => {
    void initClient();
    
    return () => {
      stopRecording();
      sessionRef.current?.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-purple-900 text-white p-6">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">🎤 Improved AudioWorklet Voice Interview</h1>
        <p className="text-gray-300">Professional implementation with proper buffering (2048 samples)</p>
        
        {/* Status */}
        <div className="bg-black/30 p-4 rounded-lg min-h-[120px]">
          <div className="text-sm text-gray-300">Status:</div>
          <div className="font-mono text-sm">{status}</div>
          {error && <div className="text-red-400 mt-2">{error}</div>}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!clientRef.current}
            className={`w-20 h-20 rounded-full border-2 border-white/20 transition-colors text-2xl ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-purple-600 hover:bg-purple-700'
            } disabled:opacity-50`}
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>
          
          <button
            onClick={reset}
            disabled={isRecording}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg disabled:opacity-50"
          >
            🔄 Reset Session
          </button>
        </div>

        <div className="text-xs text-gray-300 max-w-md space-y-1">
          <p>✅ Professional AudioWorklet with 2048-sample buffering</p>
          <p>🎯 AudioParam-controlled recording (precise timing)</p>
          <p>⚡ Much more efficient than raw frame processing</p>
          <p>🚀 Click microphone to start live voice interview</p>
        </div>
      </div>
    </div>
  );
};

export default ImprovedAudioWorkletExample; 