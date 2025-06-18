/**
 * MinimalLiveTest.tsx
 * -------------------
 * Minimal test component to debug Gemini Live API connection issues.
 * This strips away all complexity to isolate the core issue.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { GoogleGenAI, type LiveServerMessage, type Session, Modality } from '@google/genai';

const MinimalLiveTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [client, setClient] = useState<GoogleGenAI | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp}: ${message}`;
    console.log(logEntry);
    setLogs(prev => [...prev, logEntry]);
  };

  useEffect(() => {
    // Initialize client
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        addLog('❌ NEXT_PUBLIC_GEMINI_API_KEY is not set');
        return;
      }

      addLog(`✅ API key found (length: ${apiKey.length})`);
      
      const geminiClient = new GoogleGenAI({ apiKey });
      setClient(geminiClient);
      addLog('✅ GoogleGenAI client created successfully');
      
      // Check if live API is available
      if (geminiClient.live) {
        addLog('✅ client.live is available');
      } else {
        addLog('❌ client.live is NOT available');
      }
      
    } catch (error) {
      addLog(`❌ Failed to create client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const testBasicConnection = async () => {
    if (!client) {
      addLog('❌ Client not initialized');
      return;
    }

    try {
      addLog('🔌 Testing basic Live API connection...');
      
      const testSession = await client.live.connect({
        model: 'gemini-2.0-flash-live-001', // Start with the documented Live API model
        callbacks: {
          onopen: () => {
            addLog('✅ Live session opened successfully!');
          },
          onmessage: (message: LiveServerMessage) => {
            addLog(`📨 Received message: ${JSON.stringify(message, null, 2)}`);
          },
          onerror: (error: ErrorEvent) => {
            addLog(`❌ Session error: ${error.message}`);
          },
          onclose: (event: CloseEvent) => {
            addLog(`🔒 Session closed: Code ${event.code}, Reason: ${event.reason}`);
          }
        }
      });

      setSession(testSession);
      addLog('✅ Live session created, waiting for connection...');
      
    } catch (error) {
      addLog(`❌ Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const startAudioCapture = async () => {
    try {
      addLog('🎤 Requesting microphone permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      setMediaStream(stream);
      addLog('✅ Microphone access granted');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContextClass({ sampleRate: 16000 });
      setAudioContext(context);
      addLog('✅ Audio context created');

      return { stream, context };
    } catch (error) {
      addLog(`❌ Failed to start audio capture: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const testNativeAudioModel = async () => {
    if (!client) {
      addLog('❌ Client not initialized');
      return;
    }

    try {
      addLog('🔌 Testing native audio model connection...');
      
      // Start audio capture first for native audio model
      const { stream, context } = await startAudioCapture();
      
      const testSession = await client.live.connect({
        model: 'gemini-2.5-flash-preview-native-audio-dialog',
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Orus'
              }
            }
          }
        },
        callbacks: {
          onopen: async () => {
            addLog('✅ Native audio session opened successfully!');
            setIsCapturing(true);
            
            // Start sending audio data
            const source = context.createMediaStreamSource(stream);
            const processor = context.createScriptProcessor(1024, 1, 1);
            
            processor.onaudioprocess = (event) => {
              if (!testSession) return;
              
              const inputBuffer = event.inputBuffer;
              const pcmData = inputBuffer.getChannelData(0);
              
              // Convert to Int16Array and create blob
              const int16Data = new Int16Array(pcmData.length);
              for (let i = 0; i < pcmData.length; i++) {
                int16Data[i] = Math.max(-32768, Math.min(32767, pcmData[i] * 32768));
              }
              
              const blob = new Blob([int16Data.buffer], { type: 'audio/pcm' });
              
              try {
                testSession.sendRealtimeInput({ media: blob as any });
              } catch (error) {
                addLog(`❌ Error sending audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            };
            
            source.connect(processor);
            processor.connect(context.destination);
            
            addLog('🎤 Started sending audio data to Live API');
          },
          onmessage: (message: LiveServerMessage) => {
            addLog(`📨 Native audio message: ${JSON.stringify(message, null, 2)}`);
          },
          onerror: (error: ErrorEvent) => {
            addLog(`❌ Native audio error: ${error.message}`);
            setIsCapturing(false);
          },
          onclose: (event: CloseEvent) => {
            addLog(`🔒 Native audio session closed: Code ${event.code}, Reason: ${event.reason}`);
            setIsCapturing(false);
          }
        }
      });

      setSession(testSession);
      addLog('✅ Native audio session created, waiting for connection...');
      
    } catch (error) {
      addLog(`❌ Failed to connect to native audio model: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsCapturing(false);
    }
  };

  const closeSession = () => {
    if (session) {
      addLog('🔒 Closing session...');
      session.close();
      setSession(null);
    }
    
    // Stop audio capture
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
      addLog('🛑 Audio capture stopped');
    }
    
    if (audioContext) {
      void audioContext.close();
      setAudioContext(null);
    }
    
    setIsCapturing(false);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧪 Minimal Live API Test</h1>
      
      <div className="space-y-4 mb-6">
        {/* Status indicators */}
        <div className="flex gap-4 text-sm">
          <div className={`px-3 py-1 rounded ${client ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            Client: {client ? '✅ Ready' : '❌ Not initialized'}
          </div>
          <div className={`px-3 py-1 rounded ${session ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
            Session: {session ? '🔗 Connected' : '⚪ Disconnected'}
          </div>
          <div className={`px-3 py-1 rounded ${isCapturing ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
            Audio: {isCapturing ? '🎤 Capturing' : '⚪ Idle'}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={testBasicConnection}
            disabled={!client || !!session}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test Basic Live API (gemini-2.0-flash-live-001)
          </button>
          
          <button
            onClick={testNativeAudioModel}
            disabled={!client || !!session}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test Native Audio Model + Microphone
          </button>
          
          <button
            onClick={closeSession}
            disabled={!session && !isCapturing}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Close Session & Stop Audio
          </button>
          
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Logs
          </button>
        </div>
      </div>

      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
        <div className="text-gray-400 mb-2">🖥️ Live API Debug Console:</div>
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
        {logs.length === 0 && (
          <div className="text-gray-500">Ready to test... Click a button above to start.</div>
        )}
      </div>
    </div>
  );
};

export default MinimalLiveTest; 