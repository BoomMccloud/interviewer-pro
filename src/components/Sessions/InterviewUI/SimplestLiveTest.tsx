/**
 * SimplestLiveTest.tsx
 * --------------------
 * Simplest possible Live API test based on official Google example + audio playback
 */

'use client';

import React, { useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

const SimplestLiveTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp}: ${message}`;
    console.log(logEntry);
    setLogs(prev => [...prev, logEntry]);
  };

  // Function to play audio data
  const playAudioData = async (audioData: string, mimeType: string) => {
    try {
      addLog(`🔊 Playing audio: ${mimeType}`);
      
      // Decode base64 audio data
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (mimeType.includes('audio/pcm')) {
        // Handle PCM audio data
        const sampleRate = 24000; // From the mime type
        const audioBuffer = audioContext.createBuffer(1, bytes.length / 2, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Convert PCM bytes to float32 audio data
        for (let i = 0; i < channelData.length; i++) {
          const sample = (bytes[i * 2] | (bytes[i * 2 + 1] << 8)) - 32768;
          channelData[i] = sample / 32768.0;
        }
        
        // Play the audio
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        
        addLog(`✅ Audio playback started`);
      } else {
        addLog(`❌ Unsupported audio format: ${mimeType}`);
      }
    } catch (error) {
      addLog(`❌ Audio playback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testBasicLive = async () => {
    setIsRunning(true);
    const responseQueue: any[] = [];

    async function waitMessage() {
      let done = false;
      let message = undefined;
      while (!done) {
        message = responseQueue.shift();
        if (message) {
          done = true;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      return message;
    }

    async function handleTurn() {
      const turns = [];
      let done = false;
      while (!done) {
        const message = await waitMessage();
        turns.push(message);
        if (message.serverContent?.turnComplete) {
          done = true;
        }
      }
      return turns;
    }

    try {
      addLog('🚀 Starting basic Live API test...');

      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      const model = 'gemini-2.0-flash-live-001';

      const config = {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {}
      };

      addLog('🔌 Connecting to Live API...');
      
      const session = await ai.live.connect({
        model: model,
        callbacks: {
          onopen: function () {
            addLog('✅ Session opened!');
          },
          onmessage: function (message) {
            addLog(`📨 Message: ${JSON.stringify(message, null, 2)}`);
            responseQueue.push(message);
          },
          onerror: function (e) {
            addLog(`❌ Error: ${e.message}`);
          },
          onclose: function (e) {
            addLog(`🔒 Closed: ${e.reason}`);
          },
        },
        config: config,
      });

      addLog('📤 Sending text message...');
      const inputTurns = 'Hello how are you?';
      session.sendClientContent({ turns: inputTurns });

      addLog('⏳ Waiting for response...');
      const turns = await handleTurn();

      for (const turn of turns) {
        if (turn.serverContent?.outputTranscription) {
          addLog(`🎤 AI said: ${turn.serverContent.outputTranscription.text}`);
        }
        
        // Play audio data if present
        if (turn.serverContent?.modelTurn?.parts) {
          for (const part of turn.serverContent.modelTurn.parts) {
            if (part.inlineData?.data && part.inlineData?.mimeType?.includes('audio')) {
              await playAudioData(part.inlineData.data, part.inlineData.mimeType);
            }
          }
        }
      }

      addLog('🔒 Closing session...');
      session.close();
      addLog('✅ Test completed successfully!');

    } catch (error) {
      addLog(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testNativeAudio = async () => {
    setIsRunning(true);
    const responseQueue: any[] = [];

    async function waitMessage() {
      let done = false;
      let message = undefined;
      while (!done) {
        message = responseQueue.shift();
        if (message) {
          done = true;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      return message;
    }

    async function handleTurn() {
      const turns = [];
      let done = false;
      while (!done) {
        const message = await waitMessage();
        turns.push(message);
        if (message.serverContent?.turnComplete) {
          done = true;
        }
      }
      return turns;
    }

    try {
      addLog('🚀 Starting Native Audio test...');

      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      const model = 'gemini-2.5-flash-preview-native-audio-dialog';

      const config = {
        responseModalities: [Modality.AUDIO],
        outputAudioTranscription: {}
      };

      addLog('🔌 Connecting to Native Audio model...');
      
      const session = await ai.live.connect({
        model: model,
        callbacks: {
          onopen: function () {
            addLog('✅ Native Audio session opened!');
          },
          onmessage: function (message) {
            addLog(`📨 Message: ${JSON.stringify(message, null, 2)}`);
            responseQueue.push(message);
          },
          onerror: function (e) {
            addLog(`❌ Error: ${e.message}`);
          },
          onclose: function (e) {
            addLog(`🔒 Closed: ${e.reason}`);
          },
        },
        config: config,
      });

      addLog('📤 Sending text message...');
      const inputTurns = 'Hello how are you?';
      session.sendClientContent({ turns: inputTurns });

      addLog('⏳ Waiting for response...');
      const turns = await handleTurn();

      for (const turn of turns) {
        if (turn.serverContent?.outputTranscription) {
          addLog(`🎤 AI said: ${turn.serverContent.outputTranscription.text}`);
        }
        
        // Play audio data if present
        if (turn.serverContent?.modelTurn?.parts) {
          for (const part of turn.serverContent.modelTurn.parts) {
            if (part.inlineData?.data && part.inlineData?.mimeType?.includes('audio')) {
              await playAudioData(part.inlineData.data, part.inlineData.mimeType);
            }
          }
        }
      }

      addLog('🔒 Closing session...');
      session.close();
      addLog('✅ Native Audio test completed!');

    } catch (error) {
      addLog(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧪 Simplest Live API Test</h1>
      <p className="text-gray-600 mb-6">Based on official Google example - text input → audio output + playback!</p>
      
      <div className="space-y-4 mb-6">
        <div className="flex gap-4">
          <button
            onClick={testBasicLive}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test Basic Live API (gemini-2.0-flash-live-001)
          </button>
          
          <button
            onClick={testNativeAudio}
            disabled={isRunning}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test Native Audio (gemini-2.5-flash-preview-native-audio-dialog)
          </button>
          
          <button
            onClick={clearLogs}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Clear Logs
          </button>
        </div>
      </div>

      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
        <div className="text-gray-400 mb-2">🖥️ Live API Console (Official Example + Audio Playback):</div>
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

export default SimplestLiveTest; 