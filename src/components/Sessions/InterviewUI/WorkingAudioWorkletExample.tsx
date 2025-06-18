/**
 * WorkingAudioWorkletExample.tsx
 * ------------------------------
 * AudioWorkletNode with direct raw PCM access (like working ScriptProcessorNode)
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from '@google/genai';

// Utility functions
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

// Simple AudioWorklet processor - just pass raw data through
const audioWorkletCode = `
class RawAudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      // Send raw Float32Array data directly (like ScriptProcessorNode)
      const inputData = input[0];
      const maxAmplitude = Math.max(...inputData.map(Math.abs));
      
      // Send the raw data directly - no processing
      this.port.postMessage({
        type: 'rawAudio',
        data: inputData,  // Raw Float32Array
        amplitude: maxAmplitude
      });
    }
    return true;
  }
}

registerProcessor('raw-audio-processor', RawAudioProcessor);
`;

const WorkingAudioWorkletExample: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const clientRef = useRef<GoogleGenAI>();
  const sessionRef = useRef<Session>();
  
  const inputAudioContextRef = useRef<AudioContext>();
  const outputAudioContextRef = useRef<AudioContext>();
  const outputNodeRef = useRef<GainNode>();
  const nextStartTimeRef = useRef(0);
  
  const mediaStreamRef = useRef<MediaStream>();
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode>();
  const audioWorkletNodeRef = useRef<AudioWorkletNode>();
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const updateStatus = (msg: string) => {
    console.log(`[WorkingAudioWorklet] ${msg}`);
    setStatus(msg);
  };

  const updateError = (msg: string) => {
    console.error(`[WorkingAudioWorklet] ${msg}`);
    setError(msg);
  };

  // Initialize audio contexts
  const initAudio = async () => {
    try {
      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      nextStartTimeRef.current = outputAudioContextRef.current.currentTime;

      // Create AudioWorklet with raw data processor
      const blob = new Blob([audioWorkletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      await inputAudioContextRef.current.audioWorklet.addModule(workletUrl);
      updateStatus('✅ Raw AudioWorklet loaded');
      
    } catch (err) {
      console.error('Audio initialization failed:', err);
      updateError(`Audio init failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Initialize client
  const initClient = async () => {
    await initAudio();

    clientRef.current = new GoogleGenAI({
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
    });

    if (outputNodeRef.current && outputAudioContextRef.current) {
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);
    }

    await initSession();
  };

  // Initialize session
  const initSession = async () => {
    const model = 'gemini-2.5-flash-preview-native-audio-dialog';

    updateStatus('🔌 Connecting to Gemini Live...');

    try {
      const session = await clientRef.current!.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            updateStatus('✅ Gemini Live session opened');
          },
                     onmessage: (message: LiveServerMessage) => {
             console.log('[WorkingAudioWorklet] Received message:', message);
             
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
            updateError(e.message);
          },
          onclose: (e: CloseEvent) => {
            updateStatus('Session closed: ' + e.reason);
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
      updateStatus('🎯 Ready for voice interview');
    } catch (e) {
      console.error('[WorkingAudioWorklet] Session connection failed:', e);
      updateError(String(e));
    }
  };

  // Start recording with working AudioWorklet approach
  const startRecording = async () => {
    if (isRecording || !inputAudioContextRef.current) return;

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

      // Create AudioWorklet node with raw processor
      audioWorkletNodeRef.current = new AudioWorkletNode(
        inputAudioContextRef.current,
        'raw-audio-processor'
      );

             // Handle raw audio data (like ScriptProcessorNode)
       audioWorkletNodeRef.current.port.onmessage = (event) => {
         if (!isRecording || !sessionRef.current) return;

         const { data, amplitude } = event.data as { data: Float32Array; amplitude: number };
         
         // Log like our working ScriptProcessor test
         if (amplitude > 0.001) {
           console.log(`[WorkingAudioWorklet] 🎵 Audio detected! Amplitude: ${amplitude.toFixed(4)}`);
         }

         // Send raw data to Gemini (same as working ScriptProcessor)
         sessionRef.current.sendRealtimeInput({ media: createBlob(data) });
       };

      // Connect audio pipeline
      sourceNodeRef.current.connect(audioWorkletNodeRef.current);
      audioWorkletNodeRef.current.connect(inputAudioContextRef.current.destination);

      setIsRecording(true);
      updateStatus('🔴 Recording with AudioWorklet (raw PCM)...');

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

    if (audioWorkletNodeRef.current && sourceNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = undefined;
    }

    audioWorkletNodeRef.current = undefined;
    sourceNodeRef.current = undefined;

    updateStatus('⏸️ Recording stopped');
  };

  // Reset session
  const reset = () => {
    sessionRef.current?.close();
    void initSession();
    updateStatus('🔄 Session reset');
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white p-6">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">🎤 Working AudioWorklet Voice Interview</h1>
        <p className="text-gray-300">Using AudioWorkletNode with raw PCM access (like ScriptProcessor)</p>
        
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
            disabled={!sessionRef.current}
            className={`w-20 h-20 rounded-full border-2 border-white/20 transition-colors text-2xl ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
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

        <div className="text-xs text-gray-300 max-w-md">
          <p>✅ Using AudioWorkletNode with direct raw PCM access</p>
          <p>🎯 Same data flow as working ScriptProcessorNode test</p>
          <p>🚀 Click microphone to start live voice interview</p>
        </div>
      </div>
    </div>
  );
};

export default WorkingAudioWorkletExample; 