/**
 * LiveVoiceInterviewUI Component
 * 
 * Simplified voice interview interface using Gemini Live API with:
 * - 3 states: disconnected | connected | error
 * - Continuous live conversation (no stop/start recording)
 * - AI asks questions automatically via system prompt
 * - Real-time audio processing
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GeminiLiveInterviewService, type LiveSessionState } from '~/lib/geminiLiveInterview';

interface LiveVoiceInterviewUIProps {
  sessionData: {
    sessionId: string;
    personaId: string;
    currentQuestion: string;
    timeRemaining: number;
    startTime: Date | null;
  };
  currentQuestion: string;
  onEnd: () => Promise<void>;
}

type UIState = 'waiting_to_start' | 'loading' | 'interviewing' | 'error' | 'completed';

export default function LiveVoiceInterviewUI({
  sessionData,
  currentQuestion,
  onEnd,
}: LiveVoiceInterviewUIProps) {
  const [uiState, setUIState] = useState<UIState>('waiting_to_start');
  const [error, setError] = useState<string | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [sessionState, setSessionState] = useState<LiveSessionState>('disconnected');
  const liveServiceRef = useRef<GeminiLiveInterviewService | null>(null);
  const router = useRouter();

  // Initialize live service (but don't start until user clicks)
  useEffect(() => {
    const service = new GeminiLiveInterviewService({
      question: currentQuestion,
      personaId: sessionData.personaId,
      sessionId: sessionData.sessionId,
      onStateChange: (state: LiveSessionState) => {
        setSessionState(state);
        if (state === 'connected') {
          setUIState('interviewing');
        } else if (state === 'error') {
          setUIState('error');
        }
      },
      onError: (errorMsg: string) => {
        setError(errorMsg);
        setUIState('error');
      },
      onAudioReceived: (audioData: string) => {
        // AI is speaking - show visual indicator
        setIsAISpeaking(true);
        // You could also use audioData here for visualization
        console.log('AI speaking, audio data length:', audioData.length);
      },
      onTranscriptReceived: (transcript: string) => {
        // Optional: handle transcripts if available
        console.log('Transcript received:', transcript);
      }
    });

    liveServiceRef.current = service;
    
    // Don't start automatically - wait for user interaction

    return () => {
      if (liveServiceRef.current) {
        void liveServiceRef.current.endSession();
      }
    };
  }, [currentQuestion, sessionData.sessionId, sessionData.personaId]);

  // Handler to start the interview (requires user gesture)
  const handleStartInterview = async () => {
    if (!liveServiceRef.current) return;
    
    setUIState('loading');
    setError(null);
    
    try {
      await liveServiceRef.current.startSession();
    } catch (err) {
      console.error('Failed to start session:', err);
      setError('Failed to initialize interview session');
      setUIState('error');
    }
  };

  const handleEndInterview = async () => {
    if (liveServiceRef.current) {
      await liveServiceRef.current.endSession();
    }
    await onEnd();
    router.push(`/sessions/${sessionData.sessionId}/report`);
  };

  const getStatusMessage = (): string => {
    switch (uiState) {
      case 'waiting_to_start':
        return 'Ready to start your live interview';
      case 'loading':
        return 'Connecting to interview system...';
      case 'interviewing':
        return isAISpeaking ? 'Interviewer is speaking...' : 'Listening to your response...';
      case 'error':
        return 'Connection error occurred';
      case 'completed':
        return 'Interview completed';
      default:
        return 'Starting interview...';
    }
  };

  const getStatusColor = (): string => {
    switch (uiState) {
      case 'waiting_to_start':
        return 'text-blue-600 dark:text-blue-400';
      case 'loading':
        return 'text-blue-600 dark:text-blue-400';
      case 'interviewing':
        return isAISpeaking 
          ? 'text-purple-600 dark:text-purple-400' 
          : 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'completed':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getAvatarState = () => {
    if (uiState === 'waiting_to_start') {
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400';
    }
    if (uiState === 'loading') {
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 animate-pulse';
    }
    if (uiState === 'error') {
      return 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-400';
    }
    if (uiState === 'interviewing') {
      return isAISpeaking
        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 dark:border-purple-400 animate-pulse'
        : 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-400';
    }
    return 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
  };

  const getPersonIconColor = () => {
    if (uiState === 'waiting_to_start') return 'text-blue-500 dark:text-blue-400';
    if (uiState === 'loading') return 'text-blue-500 dark:text-blue-400';
    if (uiState === 'error') return 'text-red-500 dark:text-red-400';
    if (uiState === 'interviewing') {
      return isAISpeaking 
        ? 'text-purple-500 dark:text-purple-400' 
        : 'text-green-500 dark:text-green-400';
    }
    return 'text-gray-400 dark:text-gray-500';
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-b border-gray-200 dark:border-gray-600 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${
            sessionState === 'connected' ? 'bg-green-500 animate-pulse' : 
            sessionState === 'error' ? 'bg-red-500' : 'bg-blue-500 animate-pulse'
          }`}></div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Live Interview Session
          </span>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-relaxed">
          {currentQuestion || 'Loading interview question...'}
        </h2>
      </div>

      {/* Main Content - Live Interview Interface */}
      <div className="flex-1 flex items-center justify-center bg-gray-50/30 dark:bg-slate-800/30 p-8">
        <div className="flex flex-col items-center justify-center text-center max-w-lg">
          
          {/* Live Session Avatar */}
          <div className={`relative w-48 h-48 rounded-full flex items-center justify-center mb-8 transition-all duration-300 border-4 ${getAvatarState()}`}>
            {/* Person Icon */}
            <svg 
              className={`w-24 h-24 transition-colors ${getPersonIconColor()}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
            
            {/* Live indicator */}
            {uiState === 'interviewing' && (
              <div className="absolute -top-2 -right-2 flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-lg border border-gray-200 dark:border-gray-600">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">LIVE</span>
              </div>
            )}
            
            {/* AI Speaking indicator */}
            {isAISpeaking && uiState === 'interviewing' && (
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
          </div>
          
          {/* Status Message */}
          <div className={`text-2xl font-medium mb-4 ${getStatusColor()}`}>
            {getStatusMessage()}
          </div>
          
          {/* Instructions */}
          <div className="text-gray-600 dark:text-gray-400 text-center mb-8 max-w-md">
            {uiState === 'waiting_to_start' && "Click 'Start Interview' to begin your live conversation with the AI interviewer. Make sure your microphone is ready!"}
            {uiState === 'loading' && "Initializing your live interview session..."}
            {uiState === 'interviewing' && "Speak naturally. The AI interviewer will ask questions and provide feedback in real-time."}
            {uiState === 'error' && "There was a problem connecting to the interview system."}
          </div>

          {/* Start Interview Button */}
          {uiState === 'waiting_to_start' && (
            <button
              onClick={handleStartInterview}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors shadow-lg hover:shadow-xl mb-8"
            >
              🎙️ Start Interview
            </button>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-600 rounded-lg p-4 mb-6 max-w-md">
              <div className="text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-600 p-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {uiState === 'waiting_to_start' && "Ready to begin - click the button above to start"}
            {uiState === 'loading' && "Setting up your interview experience"}
            {uiState === 'interviewing' && "Live conversation mode - speak naturally when ready"}
            {uiState === 'error' && "Please try refreshing the page or contact support"}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleEndInterview}
              disabled={uiState === 'loading'}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              End Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 