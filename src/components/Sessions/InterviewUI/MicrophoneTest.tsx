/**
 * MicrophoneTest.tsx
 * ------------------
 * Simple microphone test to isolate audio capture issues
 */

'use client';

import React, { useState, useRef } from 'react';

const MicrophoneTest: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef<AudioContext>();
  const mediaStreamRef = useRef<MediaStream>();
  const analyserRef = useRef<AnalyserNode>();
  const animationRef = useRef<number>();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp}: ${message}`;
    console.log(logEntry);
    setLogs(prev => [...prev, logEntry]);
  };

  const startTest = async () => {
    try {
      addLog('🎤 Starting microphone test...');
      
      // Create audio context
      audioContextRef.current = new AudioContext();
      addLog(`✅ AudioContext created (sample rate: ${audioContextRef.current.sampleRate})`);

      // Get microphone
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      addLog('✅ Microphone access granted');

      // Create analyser for volume detection
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      source.connect(analyserRef.current);
      
      // ALSO test ScriptProcessorNode (like the original example)
      const scriptProcessor = audioContextRef.current.createScriptProcessor(256, 1, 1);
      scriptProcessor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        const maxAmplitude = Math.max(...inputData.map(Math.abs));
        
        if (maxAmplitude > 0.001) {
          addLog(`🎵 ScriptProcessor detected audio! Amplitude: ${maxAmplitude.toFixed(4)}`);
        }
      };
      
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContextRef.current.destination);
      
      addLog('✅ Audio pipeline connected (both AnalyserNode + ScriptProcessor)');

      // Start volume monitoring with time domain data (more reliable)
      const dataArray = new Uint8Array(analyserRef.current.fftSize);
      
      const updateVolume = () => {
        if (!analyserRef.current || !isRecording) return;
        
        // Use time domain data instead of frequency data
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        // Calculate RMS (Root Mean Square) for volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128; // Convert to -1 to 1 range
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        
        setVolume(rms);
        
        // Also log raw data for debugging
        const maxValue = Math.max(...dataArray);
        const minValue = Math.min(...dataArray);
        
        addLog(`📊 Raw data - min: ${minValue}, max: ${maxValue}, RMS: ${rms.toFixed(4)}`);
        
        if (rms > 0.01) {
          addLog(`🔊 AUDIO DETECTED! RMS Volume: ${rms.toFixed(3)}`);
        }
        
        animationRef.current = requestAnimationFrame(updateVolume);
      };

      setIsRecording(true);
      updateVolume();
      addLog('🔴 Recording started - speak into microphone!');

    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopTest = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setIsRecording(false);
    setVolume(0);
    addLog('⏹️ Test stopped');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-900 text-white p-6">
      <div className="bg-white/10 rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">🎤 Microphone Test</h1>
        
        {/* Volume Meter */}
        <div className="mb-6">
          <div className="text-sm mb-2">Volume Level:</div>
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div 
              className="bg-green-500 h-4 rounded-full transition-all duration-100"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
          <div className="text-xs text-center mt-1">{(volume * 100).toFixed(1)}%</div>
        </div>

        {/* Controls */}
        <div className="space-y-4 mb-6">
          <button
            onClick={isRecording ? stopTest : startTest}
            className={`w-full py-3 px-4 rounded-lg font-medium ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isRecording ? '⏹️ Stop Test' : '🎤 Start Microphone Test'}
          </button>
          
          <button
            onClick={clearLogs}
            className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg"
          >
            Clear Logs
          </button>
        </div>

        {/* Logs */}
        <div className="bg-black/50 p-3 rounded-lg h-40 overflow-y-auto">
          <div className="text-xs font-mono">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
            {logs.length === 0 && (
              <div className="text-gray-400">Click "Start Test" to begin...</div>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-300 text-center">
          This test verifies basic microphone capture without Gemini
        </div>
      </div>
    </div>
  );
};

export default MicrophoneTest; 