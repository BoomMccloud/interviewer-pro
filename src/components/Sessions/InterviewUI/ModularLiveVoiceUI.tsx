import React, { useState, useCallback, useRef } from 'react';
import AudioWorkletManager from './AudioWorkletManager';
import GeminiConnectionManager from './GeminiConnectionManager';

const ModularLiveVoiceUI: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);

  const sendAudioRef = useRef<((audioBlob: Blob) => void) | null>(null);

  const updateStatus = useCallback((msg: string) => {
    console.log(`[ModularLiveVoice] ${msg}`);
    setStatus(msg);
    setError(''); // Clear error when status updates
  }, []);

  const updateError = useCallback((msg: string) => {
    console.error(`[ModularLiveVoice] ${msg}`);
    setError(msg);
  }, []);

  // Handle audio data from AudioWorklet
  const handleAudioData = useCallback((audioBlob: Blob, amplitude: number) => {
    if (sendAudioRef.current && amplitude > 0.001) {
      sendAudioRef.current(audioBlob);
    }
  }, []);

  // Handle connection ready from Gemini
  const handleConnectionReady = useCallback((sendAudio: (audioBlob: Blob) => void) => {
    sendAudioRef.current = sendAudio;
    setIsReady(true);
    updateStatus('🎯 Ready - click microphone to start interview');
  }, [updateStatus]);

  // Start/stop recording
  const toggleRecording = useCallback(async () => {
    if (!isReady) {
      updateError('Connection not ready yet');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      updateStatus('⏹️ Stopping recording...');
    } else {
      setIsRecording(true);
      updateStatus('🔴 Starting recording...');
    }
  }, [isRecording, isReady, updateStatus, updateError]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-900 text-white p-6">
      {/* Audio Manager (invisible) */}
      <AudioWorkletManager
        isRecording={isRecording}
        onAudioData={handleAudioData}
        onStatusUpdate={updateStatus}
        onError={updateError}
      />

      {/* Connection Manager (invisible) */}
      <GeminiConnectionManager
        onStatusUpdate={updateStatus}
        onError={updateError}
        onConnectionReady={handleConnectionReady}
      />

      {/* UI */}
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">🎤 Modular Live Voice Interview</h1>
        <p className="text-gray-300">Separated audio and connection management</p>
        
        {/* Status */}
        <div className="bg-black/30 p-4 rounded-lg min-h-[120px]">
          <div className="text-sm text-gray-300">Status:</div>
          <div className="font-mono text-sm">{status}</div>
          {error && <div className="text-red-400 mt-2">{error}</div>}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <button
            onClick={toggleRecording}
            disabled={!isReady}
            className={`w-20 h-20 rounded-full border-2 border-white/20 transition-colors text-2xl ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>
        </div>

        <div className="text-xs text-gray-300 max-w-md space-y-1">
          <p>✅ Modular architecture with separated concerns</p>
          <p>🎵 AudioWorklet handles microphone and buffering</p>
          <p>🔌 GeminiConnection handles Live API session</p>
          <p>🚀 Click microphone to start live voice interview</p>
        </div>
      </div>
    </div>
  );
};

export default ModularLiveVoiceUI; 