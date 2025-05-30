'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Timer from '~/components/UI/Timer';
import TextInterviewUI from '~/components/Sessions/InterviewUI/TextInterviewUI';
import VoiceInterviewUI from '~/components/Sessions/InterviewUI/VoiceInterviewUI';
import { api } from "~/trpc/react";
import type { MvpSessionTurn } from "~/types";

// Define modality type
type InterviewModality = 'text' | 'voice' | 'avatar';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  // State for current modality
  const [currentModality, setCurrentModality] = useState<InterviewModality>('text');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  
  // Ref to track if auto-start has been attempted to prevent multiple calls
  const autoStartAttempted = useRef(false);

  // Fetch active session data from our backend
  const { data: sessionData, isLoading, error } = api.session.getActiveSession.useQuery({ 
    sessionId 
  });

  // Mutations for backend interaction
  const getNextQuestionMutation = api.session.getNextQuestion.useMutation();
  const updateSessionMutation = api.session.updateSessionState.useMutation();
  const startInterviewMutation = api.session.startInterviewSession.useMutation();

  // Extract current question from session data and auto-start interview if needed
  useEffect(() => {
    if (sessionData?.currentQuestion) {
      setCurrentQuestion(sessionData.currentQuestion);
      
      // Auto-start interview if it hasn't been started yet (questionNumber = 0)
      // Only attempt once to prevent infinite loops
      if (sessionData.questionNumber === 0 && 
          sessionData.currentQuestion.includes('not started') && 
          !autoStartAttempted.current) {
        
        console.log('Auto-starting interview session...');
        autoStartAttempted.current = true; // Mark as attempted
        
        startInterviewMutation.mutate({
          sessionId,
          personaId: sessionData.personaId,
        }, {
          onSuccess: (response) => {
            setCurrentQuestion(response.currentQuestion);
            console.log('Interview started successfully');
          },
          onError: (error) => {
            console.error('Failed to start interview:', error);
            // Reset the flag on error so user can try again if needed
            autoStartAttempted.current = false;
          }
        });
      }
    }
  }, [sessionData, sessionId]); // Removed startInterviewMutation from dependencies

  const handleSendMessage = async (messageText: string) => {
    if (!sessionData || isProcessingResponse) return;
    
    setIsProcessingResponse(true);
    try {
      const response = await getNextQuestionMutation.mutateAsync({
        sessionId,
        userResponse: messageText,
      });
      
      // Update current question with the new AI response
      if (response.nextQuestion) {
        setCurrentQuestion(response.nextQuestion);
      } else {
        // Interview completed - redirect to report
        void handleEndSession();
      }
    } catch (error) {
      console.error('Error getting next question:', error);
    } finally {
      setIsProcessingResponse(false);
    }
  };

  const handleVoiceInput = (audioBlob: Blob) => {
    console.log(`Voice input received for session ${sessionId}:`, audioBlob);
    // Future: Convert audio to text, then call handleSendMessage
  };

  const handlePauseSession = async () => {
    try {
      await updateSessionMutation.mutateAsync({
        sessionId,
        action: 'pause',
      });
      // Navigate back to dashboard or show pause state
      router.push('/dashboard');
    } catch (error) {
      console.error('Error pausing session:', error);
    }
  };

  const handleEndSession = async () => {
    try {
      await updateSessionMutation.mutateAsync({
        sessionId,
        action: 'end',
      });
      // Navigate to the session report
      router.push(`/sessions/${sessionId}/report`);
    } catch (error) {
      console.error('Error ending session:', error);
      // Still navigate to report even if error
      router.push(`/sessions/${sessionId}/report`);
    }
  };

  // Loading and error states
  if (isLoading) {
    return (
      <div className="container">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading interview session...</div>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="container">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Session Not Found</h2>
            <p className="text-gray-600 mb-4">The interview session could not be loaded.</p>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={() => router.push('/dashboard')}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if session is completed
  if (!sessionData.isActive) {
    router.push(`/sessions/${sessionId}/report`);
    return null;
  }

  const renderInterviewUI = () => {
    const commonProps = {
      sessionData,
      currentQuestion,
      isProcessingResponse,
      onPause: handlePauseSession,
      onEnd: handleEndSession,
    };

    switch (currentModality) {
      case 'voice':
        return (
          <VoiceInterviewUI 
            {...commonProps}
            onSendVoiceInput={handleVoiceInput}
          />
        );
      case 'avatar':
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Avatar Interview Mode</h3>
              <p className="text-gray-600">Coming Soon - Enhanced AI Avatar Experience</p>
            </div>
          </div>
        );
      case 'text':
      default:
        return (
          <TextInterviewUI
            {...commonProps}
            onSendMessage={handleSendMessage}
          />
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 h-screen flex flex-col">
      {/* Header with Timer and Session Info */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Interview</h1>
          <p className="text-gray-600">Session with {sessionData.personaId}</p>
        </div>
        <Timer 
          initialSeconds={30 * 60} // 30 minutes default
          onTimerEnd={handleEndSession} 
        />
      </div>

      {/* Modality Selector - Dev Only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-yellow-800">Dev Mode - Switch Modality:</span>
            <button 
              className={`px-3 py-1 text-sm rounded ${currentModality === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setCurrentModality('text')}
            >
              Text
            </button>
            <button 
              className={`px-3 py-1 text-sm rounded ${currentModality === 'voice' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setCurrentModality('voice')}
            >
              Voice
            </button>
            <button 
              className={`px-3 py-1 text-sm rounded ${currentModality === 'avatar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setCurrentModality('avatar')}
            >
              Avatar
            </button>
          </div>
        </div>
      )}
      
      {/* Main Interview Interface - Flex Layout */}
      <div className="flex-1 flex flex-col">
        {renderInterviewUI()}
      </div>
    </div>
  );
} 