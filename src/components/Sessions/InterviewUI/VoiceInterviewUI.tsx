/**
 * VoiceInterviewUI Component
 * 
 * This component provides the voice-based interview interface with:
 * - Current question displayed prominently at the top
 * - Voice recording interface with full workflow support
 * - Error handling and accessibility features
 * - Integration with live interview backend procedures
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Timer from '~/components/UI/Timer';

interface ConversationMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: string;
}

interface VoiceInterviewUIProps {
  sessionData: {
    sessionId: string;
    isActive: boolean;
    personaId: string;
    currentQuestion: string;
    keyPoints?: string[];
    conversationHistory: ConversationMessage[];
    questionNumber: number;
    timeRemaining: number;
    startTime: Date | null;
  };
  currentQuestion: string;
  keyPoints?: string[];
  isProcessingResponse: boolean;
  onSendVoiceInput: (audioBlob: Blob) => Promise<void>;
  onPause: () => Promise<void>;
  onEnd: () => Promise<void>;
}

type RecordingState = 'idle' | 'recording' | 'stopped' | 'error';

export default function VoiceInterviewUI({
  sessionData,
  currentQuestion,
  keyPoints,
  isProcessingResponse,
  onSendVoiceInput,
  onPause,
  onEnd,
}: VoiceInterviewUIProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Initialize conversation history from sessionData
  useEffect(() => {
    if (sessionData?.conversationHistory) {
      setConversationHistory(sessionData.conversationHistory);
    }
  }, [sessionData]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        setRecordingState('stopped');
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecordingState('recording');
      setRecordingDuration(0);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      setError('Microphone access denied. Please enable microphone permission and try again.');
      setRecordingState('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recordingState === 'recording') {
      mediaRecorder.stop();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  };

  const handleSubmitRecording = async () => {
    if (!audioBlob) return;
    
    try {
      await onSendVoiceInput(audioBlob);
      // Reset for next recording
      setAudioBlob(null);
      setRecordingState('idle');
      setRecordingDuration(0);
    } catch (err) {
      setError('Failed to process voice recording. Please try again.');
      setRecordingState('error');
    }
  };

  const handleRetryRecording = () => {
    setAudioBlob(null);
    setRecordingState('idle');
    setRecordingDuration(0);
    setError(null);
  };

  const getStatusMessage = (): string => {
    switch (recordingState) {
      case 'recording':
        return `Recording... ${formatTime(recordingDuration)}`;
      case 'stopped':
        return 'Recording complete. Ready to send.';
      case 'error':
        return error ?? 'An error occurred';
      default:
        return 'Ready to record your response';
    }
  };

  const getRecordButtonLabel = (): string => {
    switch (recordingState) {
      case 'recording':
        return 'Stop recording';
      case 'stopped':
        return 'Record again';
      default:
        return 'Start recording';
    }
  };

  return (
    <div
      data-testid="voice-interview-ui"
      className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600"
    >
      {/* Current Question Section - Top */}
      <div className="flex-shrink-0 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 border-b border-gray-200 dark:border-gray-600 p-6">
        <div className="w-full flex gap-6">
          {/* Questions and Guidance Container */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Current Question:
              </span>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-relaxed mb-4 p-4 bg-gray-50/30 dark:bg-slate-800/30 rounded-lg">
              {currentQuestion || 'Loading next question...'}
            </h2>
            
            {/* Voice Guidance */}
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-green-100 dark:border-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 dark:text-green-400 text-xs font-semibold">🎤</span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <strong className="text-green-900 dark:text-green-400">Key points:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {keyPoints && keyPoints.length > 0 ? (
                      keyPoints.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))
                    ) : (
                      <>
                        <li>Focus on your specific role and contributions</li>
                        <li>Highlight technologies and tools you used</li>
                        <li>Discuss challenges faced and how you overcame them</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Timer Container */}
          <div className="flex-shrink-0 flex items-center">
            {sessionData.startTime && <Timer />}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Voice Interface Section - Left Side */}
        <div className="w-1/2 flex items-center justify-center bg-gray-50/30 dark:bg-slate-800/30 p-8">
          <div className="text-center max-w-md">
            {/* Recording Status */}
            <div role="status" aria-live="polite" className="mb-6">
              <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${
                recordingState === 'recording'
                  ? 'bg-red-500 dark:bg-red-600 shadow-lg animate-pulse' 
                  : recordingState === 'error'
                  ? 'bg-orange-500 dark:bg-orange-600'
                  : recordingState === 'stopped'
                  ? 'bg-blue-500 dark:bg-blue-600'
                  : 'bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-500 shadow-md hover:shadow-lg'
              }`}>
                <button
                  onClick={recordingState === 'recording' ? stopRecording : startRecording}
                  disabled={isProcessingResponse || recordingState === 'stopped'}
                  aria-label={getRecordButtonLabel()}
                  className="w-full h-full flex items-center justify-center text-white text-4xl disabled:opacity-50"
                >
                  {recordingState === 'recording' ? '⏹️' : '🎤'}
                </button>
              </div>
              
              <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {getStatusMessage()}
              </div>
              
              {recordingState === 'recording' && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Duration: {formatTime(recordingDuration)}
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-600 rounded-lg p-4 mb-6">
                <div className="text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {recordingState === 'stopped' && audioBlob && (
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleSubmitRecording}
                    disabled={isProcessingResponse}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isProcessingResponse ? 'Sending...' : 'Send Recording'}
                  </button>
                  <button
                    onClick={handleRetryRecording}
                    disabled={isProcessingResponse}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {(recordingState === 'error' || recordingState === 'idle') && (
                <button
                  onClick={() => window.location.href = `${window.location.pathname}?mode=text`}
                  className="px-6 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Switch to Text Mode
                </button>
              )}
            </div>

            {/* Processing Indicator */}
            {isProcessingResponse && (
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-600 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-400">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="font-medium">Transcribing and preparing next question...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat History Section - Right Side */}
        <div className="w-1/2 border-l border-gray-200 dark:border-gray-600">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Conversation History</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Review your previous responses</p>
            </div>
            
            <div 
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {conversationHistory.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <div className="text-lg mb-2">🎙️</div>
                    <p>Your voice conversation will appear here</p>
                    <p className="text-sm mt-1">Start recording to begin</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversationHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-green-600 dark:bg-green-500 text-white'
                            : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'
                        }`}
                      >
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Section - Bottom */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-600 p-6">
        <div className="w-full">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Voice mode with real-time transcription. Speak naturally and clearly for best results.
            </div>
            <div className="flex gap-3">
              <button
                onClick={onPause}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Pause
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