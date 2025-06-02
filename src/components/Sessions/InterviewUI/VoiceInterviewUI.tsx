/**
 * VoiceInterviewUI Component
 * 
 * This component provides the voice-based interview interface with:
 * - Current question displayed prominently at the top
 * - Voice recording interface 
 * - Future enhancement: Real voice-to-text integration
 * - Integration with live interview backend procedures
 */

'use client';

import React, { useState } from 'react';

interface VoiceInterviewUIProps {
  sessionData: {
    sessionId: string;
    isActive: boolean;
    personaId: string;
    currentQuestion: string;
    conversationHistory: Array<{
      role: 'ai' | 'user';
      content: string;
      timestamp: string;
    }>;
    questionNumber: number;
    timeRemaining: number;
  };
  currentQuestion: string;
  isProcessingResponse: boolean;
  onSendVoiceInput: (audioBlob: Blob) => void;
  onPause: () => Promise<void>;
  onEnd: () => Promise<void>;
}

export default function VoiceInterviewUI({
  sessionData,
  currentQuestion,
  isProcessingResponse,
  onSendVoiceInput,
  onPause,
  onEnd,
}: VoiceInterviewUIProps) {
  const [isRecording, setIsRecording] = useState(false);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    // Future: Start actual voice recording
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // Future: Stop recording and process audio
    // For now, create a mock blob
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
    onSendVoiceInput(mockBlob);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
      {/* Current Question Section - Top */}
      <div className="flex-shrink-0 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 border-b border-gray-200 dark:border-gray-600 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Question {sessionData.questionNumber} • {sessionData.personaId} • Voice Mode
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-relaxed">
                {currentQuestion || 'Loading next question...'}
              </h2>
            </div>
            <div className="flex-shrink-0 ml-4">
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400">Time Remaining</div>
                <div className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                  {formatTime(sessionData.timeRemaining)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Voice Guidance */}
          <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-green-100 dark:border-gray-600">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 dark:text-green-400 text-xs font-semibold">🎤</span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <strong className="text-green-900 dark:text-green-400">Voice Guidance:</strong> Click the microphone to start recording your response. 
                Speak clearly and take your time to articulate your thoughts.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Interface Section - Middle */}
      <div className="flex-1 flex items-center justify-center bg-gray-50/30 dark:bg-slate-800/30 p-8">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${
              isRecording 
                ? 'bg-red-500 dark:bg-red-600 shadow-lg animate-pulse' 
                : 'bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-500 shadow-md hover:shadow-lg'
            }`}>
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isProcessingResponse}
                className="w-full h-full flex items-center justify-center text-white text-4xl disabled:opacity-50"
              >
                {isRecording ? '⏹️' : '��'}
              </button>
            </div>
            
            <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {isRecording ? 'Recording...' : 'Ready to Record'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isRecording 
                ? 'Click the button again to stop recording'
                : 'Click the microphone to start recording your response'
              }
            </div>
          </div>

          {/* Recording Status */}
          {isRecording && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-600 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-red-700 dark:text-red-400">
                <div className="w-3 h-3 bg-red-500 dark:bg-red-400 rounded-full animate-ping"></div>
                <span className="font-medium">Recording in progress...</span>
              </div>
            </div>
          )}

          {/* Processing Status */}
          {isProcessingResponse && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-600 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-400">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="font-medium">Processing your response...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls Section - Bottom */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-600 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Voice mode is currently in preview. Full voice-to-text integration coming soon.
            </div>
            <div className="flex gap-3">
              <button
                onClick={onPause}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Pause Session
              </button>
              <button
                onClick={onEnd}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                End Interview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 