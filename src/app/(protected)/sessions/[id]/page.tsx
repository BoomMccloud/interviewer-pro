'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import TextInterviewUI from '~/components/Sessions/InterviewUI/TextInterviewUI';
import VoiceInterviewUI from '~/components/Sessions/InterviewUI/VoiceInterviewUI';
import Timer from '~/components/UI/Timer';

type InterviewMode = 'text' | 'voice' | 'avatar';

export default function SessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const sessionId = params.id as string;
  const mode = (searchParams.get('mode') ?? 'text') as InterviewMode;

  // Mock session data structure - will be replaced with real tRPC integration
  const mockSessionData = {
    sessionId,
    isActive: true,
    personaId: 'technical-interviewer',
    currentQuestion: 'Tell me about yourself and your background in software development.',
    conversationHistory: [],
    questionNumber: 1,
    timeRemaining: 1800 // 30 minutes
  };

  // Mock handlers - will be replaced with real tRPC mutations
  const handleSendMessage = async (message: string) => {
    console.log('Sending message:', message);
    // TODO: Connect to api.interview.getNextQuestion.useMutation()
  };

  const handleSendVoiceInput = (audioBlob: Blob) => {
    console.log('Sending voice input:', audioBlob);
    // TODO: Connect to voice processing and then getNextQuestion
  };

  const handlePause = async () => {
    console.log('Pausing session');
    // TODO: Connect to api.interview.updateSessionState.useMutation()
  };

  const handleEnd = async () => {
    console.log('Ending session');
    // TODO: Connect to api.interview.updateSessionState.useMutation()
  };

  const renderInterviewMode = () => {
    switch (mode) {
      case 'text':
        return (
          <TextInterviewUI
            sessionData={mockSessionData}
            currentQuestion={mockSessionData.currentQuestion}
            isProcessingResponse={false}
            onSendMessage={handleSendMessage}
            onPause={handlePause}
            onEnd={handleEnd}
          />
        );
      
      case 'voice':
        return (
          <VoiceInterviewUI
            sessionData={mockSessionData}
            currentQuestion={mockSessionData.currentQuestion}
            isProcessingResponse={false}
            onSendVoiceInput={handleSendVoiceInput}
            onPause={handlePause}
            onEnd={handleEnd}
          />
        );
      
      case 'avatar':
        // TODO: Implement AvatarInterviewUI
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Avatar Mode Coming Soon
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Avatar interviews will be available in the next update.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Currently showing: {mode} mode for session {sessionId}
              </p>
            </div>
          </div>
        );
      
      default:
        // Fallback to text mode
        return (
          <TextInterviewUI
            sessionData={mockSessionData}
            currentQuestion={mockSessionData.currentQuestion}
            isProcessingResponse={false}
            onSendMessage={handleSendMessage}
            onPause={handlePause}
            onEnd={handleEnd}
          />
        );
    }
  };

  return (
    <div className="h-screen bg-white dark:bg-slate-900 flex flex-col">
      {/* Timer positioned to avoid theme toggle overlap */}
      <div className="absolute top-20 right-4 z-10">
        <Timer />
      </div>

      {/* Interview Interface - mode-specific */}
      <div className="flex-1">
        {renderInterviewMode()}
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 bg-black/75 text-white text-xs px-2 py-1 rounded">
          Mode: {mode} | Session: {sessionId}
        </div>
      )}
    </div>
  );
} 