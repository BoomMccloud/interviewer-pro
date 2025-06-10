'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '~/trpc/react';
import TextInterviewUI from '~/components/Sessions/InterviewUI/TextInterviewUI';
import VoiceInterviewUI from '~/components/Sessions/InterviewUI/VoiceInterviewUI';
import { INTERVIEW_MODES, SESSION_STATES, PERSONA_IDS } from '~/types';
import type { InterviewMode, SessionState, GeneratedQuestion, PersonaId } from '~/types';
import { getPersona } from '~/lib/personaService';

export default function SessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const utils = api.useUtils();
  
  const sessionId = params.id as string;
  const mode = (searchParams.get('mode') ?? INTERVIEW_MODES.TEXT) as InterviewMode;
  const [sessionState, setSessionState] = useState<SessionState>(SESSION_STATES.LOADING);
  const [showQuestionGenerator, setShowQuestionGenerator] = useState(false);
  const [generatedQuestion, setGeneratedQuestion] = useState<GeneratedQuestion | null>(null);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [userInput, setUserInput] = useState<string>('');
  const [personaName, setPersonaName] = useState<string>('');

  // Question types to randomly select from
  const questionTypes = ['opening', 'technical', 'behavioral', 'followup'] as const;

  // tRPC queries and mutations - Updated to use separated procedures
  const activeSession = api.session.getActiveSession.useQuery({ 
    sessionId 
  }, {
    retry: false // Don't retry on 404/error
  });

  // Get user's JD/Resume data for question generation
  const { data: jdResumeText } = api.jdResume.getJdResumeText.useQuery();
  
  const startSession = api.session.startInterviewSession.useMutation({
    onSuccess: () => {
      setSessionState(SESSION_STATES.ACTIVE);
      void activeSession.refetch();
    },
    onError: (error) => {
      console.error('Failed to start session:', error);
      if (error.message.includes('already completed')) {
        setSessionState(SESSION_STATES.COMPLETED);
      } else {
        setSessionState(SESSION_STATES.ERROR);
      }
    }
  });
  
  // 🔗 NEW: Use saveSession + startSession combination to replace deprecated resetSession
  const saveSession = api.session.saveSession.useMutation({
    onError: (error) => {
      console.error('Failed to save session during reset:', error);
      setSessionState(SESSION_STATES.ERROR);
    }
  });

  const handleResetSession = async () => {
    try {
      // Step 1: Save/complete current session
      await saveSession.mutateAsync({ sessionId });
      
      // Step 2: Start fresh session with original persona
      const sessionPersonaId = activeSession.data?.personaId;
      const validPersonaIds = Object.values(PERSONA_IDS) as string[];
      const personaId: PersonaId = (validPersonaIds.includes(sessionPersonaId ?? '')) 
        ? sessionPersonaId as PersonaId
        : PERSONA_IDS.HR_RECRUITER_GENERAL;
      
      await startSession.mutateAsync({ 
        sessionId, 
        personaId: personaId  // ✅ Use original persona from the session
      });
    } catch (error) {
      console.error('Failed to reset session:', error);
      setSessionState(SESSION_STATES.ERROR);
    }
  };
  
  // 🔗 NEW: Use separated submitResponse for conversational responses
  const submitResponse = api.session.submitResponse.useMutation({
    onSuccess: () => {
      void activeSession.refetch();
    },
    onError: (error) => {
      console.error('Error submitting response:', error);
    }
  });

  // 🔗 NEW: Use separated getNextTopicalQuestion for topic transitions  
  const getNextTopicalQuestion = api.session.getNextTopicalQuestion.useMutation({
    onSuccess: () => {
      void activeSession.refetch();
    },
    onError: (error) => {
      console.error('Error getting next topic:', error);
    }
  });

  // Handle session state based on query results
  useEffect(() => {
    if (activeSession.isSuccess && activeSession.data) {
      if (activeSession.data.isActive) {
        setSessionState(SESSION_STATES.ACTIVE);
      } else {
        setSessionState(SESSION_STATES.COMPLETED);
      }
    } else if (activeSession.isError) {
      if (activeSession.error?.data?.code === 'NOT_FOUND') {
        setSessionState(SESSION_STATES.NEW);
      } else {
        setSessionState(SESSION_STATES.ERROR);
      }
    }
  }, [activeSession.isSuccess, activeSession.isError, activeSession.data, activeSession.error]);

  // Handle session initialization based on state
  useEffect(() => {
    if (sessionState === SESSION_STATES.NEW) {
      // Session doesn't exist but was just created - it should already have questions
      // Just refetch to get the newly created session data
      void activeSession.refetch();
    }
  }, [sessionState, sessionId, activeSession]);

  // Fetch persona name when session data is available
  useEffect(() => {
    if (activeSession.data?.personaId) {
      getPersona(activeSession.data.personaId)
        .then((persona) => {
          if (persona) {
            setPersonaName(persona.name);
          }
        })
        .catch((error) => {
          console.error('Failed to get persona:', error);
        });
    }
  }, [activeSession.data?.personaId]);

  // Handle question generation
  const handleGenerateQuestion = async () => {
    console.log('🎯 Generate Question button clicked!');
    console.log('📚 Previous questions count:', generatedQuestion ? 1 : 0);
    console.log('jdResumeText:', jdResumeText);
    console.log('jdResumeText?.id:', jdResumeText?.id);

    if (!jdResumeText?.id) {
      console.error('❌ No JD/Resume ID found');
      alert('Please save your JD/Resume first on the dashboard. No JD/Resume data found.');
      return;
    }

    console.log(`✅ JD/Resume ID found, attempting to generate a question...`);
    setIsGeneratingQuestion(true);

    try {
      console.log('🔄 Calling utils.session.generateInterviewQuestion.fetch...');
      const result = await utils.session.generateInterviewQuestion.fetch({
        jdResumeTextId: jdResumeText.id,
        personaId: PERSONA_IDS.HR_RECRUITER_GENERAL,
        questionType: questionTypes[Math.floor(Math.random() * questionTypes.length)],
      });
      console.log('📋 Fetch result:', result);
      
      if (result) {
        console.log('✅ Question generated successfully:', result);
        setGeneratedQuestion(result);
        setShowQuestionGenerator(true);
        console.log('🎭 Modal state set: showQuestionGenerator = true');
        console.log('📝 Generated question set:', result.question);
      } else {
        console.error('❌ No data in result:', result);
        alert('No question data received. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Failed to generate question:', error);
      alert(`Failed to generate question: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  // 🔗 NEW: Separated handlers for clean conversation flow
  const handleSendMessage = async (message: string) => {
    try {
      // Use submitResponse for conversational responses within same topic
      await submitResponse.mutateAsync({
        sessionId,
        userResponse: message
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // 🔗 NEW: Handler for user-controlled topic transitions
  const handleGetNextTopic = async () => {
    try {
      await getNextTopicalQuestion.mutateAsync({
        sessionId
      });
    } catch (error) {
      console.error('Error getting next topic:', error);
    }
  };

  const handleSendVoiceInput = async (audioBlob: Blob) => {
    console.log('Voice input received:', audioBlob);
    await handleSendMessage('Voice response processed');
  };

  const handleSave = async () => {
    console.log('Saving session state');
    // TODO: Implement save functionality with new QuestionSegments procedures
    alert('Save functionality temporarily disabled during migration');
  };

  const handleEnd = async () => {
    console.log('Ending session');
    
    // Confirm before ending the interview
    const confirmed = window.confirm(
      'Are you sure you want to end this interview session? This action cannot be undone.'
    );
    
    if (!confirmed) {
      return;
    }
    
    // TODO: Implement end functionality with new QuestionSegments procedures
    // For now, just navigate to report
    router.push(`/sessions/${sessionId}/report`);
  };

  const handleRestartSession = () => {
    // Confirm before restarting the session
    const confirmed = window.confirm(
      'Are you sure you want to restart this interview session? This will end the current session and start fresh with the same persona.'
    );
    
    if (confirmed) {
      void handleResetSession();
    }
  };

  const handleViewReport = () => {
    router.push(`/sessions/${sessionId}/report`);
  };

  // Loading state
  if (sessionState === SESSION_STATES.LOADING || startSession.isPending || saveSession.isPending) {
    return (
      <div className="h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
            role="status"
            aria-label="Loading session"
          />
          <p className="text-gray-600 dark:text-gray-400">
            {sessionState === SESSION_STATES.LOADING ? 'Loading session...' : 
             saveSession.isPending ? 'Resetting session...' : 
             'Starting your interview session...'}
          </p>
        </div>
      </div>
    );
  }

  // Completed session - give user options
  if (sessionState === SESSION_STATES.COMPLETED) {
    return (
      <div className="h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Interview Completed!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              This interview session has already been completed. What would you like to do?
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleViewReport}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              View Interview Report
            </button>
            <button
              onClick={handleRestartSession}
              className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Start New Interview (Same JD/Resume)
            </button>
            <button
              onClick={handleGenerateQuestion}
              disabled={isGeneratingQuestion}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingQuestion ? 'Generating...' : 'Generate Sample Question'}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Mode: {mode} | Session: {sessionId}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (sessionState === SESSION_STATES.ERROR) {
    return (
      <div className="h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Session Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            There was an error loading this interview session.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Active session - render interview UI
  if (sessionState === SESSION_STATES.ACTIVE && activeSession.data) {
    const renderInterviewMode = () => {
      const sessionData = activeSession.data;
      
      // Map current session data structure to new TextInterviewUI interface
      const mappedSessionData = {
        sessionId: sessionData.sessionId,
        history: sessionData.conversationHistory.map((msg: { role: string; content: string; timestamp: string }) => {
          // Fix role mapping bug and add explicit error handling
          let mappedRole: 'ai' | 'user';
          
          if (msg.role === 'ai' || msg.role === 'model') {
            mappedRole = 'ai';
          } else if (msg.role === 'user') {
            mappedRole = 'user';
          } else {
            // Fail fast instead of defaulting to prevent silent bugs
            throw new Error(`Unexpected conversation role: '${msg.role}'. Expected 'ai', 'model', or 'user'. This indicates a backend/frontend role mapping inconsistency.`);
          }
          
          return {
            role: mappedRole,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
          };
        }),
        currentQuestion: sessionData.currentQuestion,
        keyPoints: sessionData.keyPoints,
        status: sessionData.isActive ? 'active' as const : 'completed' as const,
        startTime: new Date(), // Default to current time for now
        personaName: personaName, // Add persona name to session data
      };
      
      switch (mode) {
        case INTERVIEW_MODES.TEXT:
          return (
            <TextInterviewUI
              sessionData={mappedSessionData}
              userInput={userInput}
              setUserInput={setUserInput}
              onSubmitResponse={handleSendMessage}
              isLoading={submitResponse.isPending}
              onGetNextTopic={handleGetNextTopic}
              isGettingNextTopic={getNextTopicalQuestion.isPending}
              onSave={handleSave}
              onEnd={handleEnd}
              isSaving={false} // Temporary: was updateSessionState.isPending
              isEnding={false} // Temporary: was updateSessionState.isPending
            />
          );
        
        case INTERVIEW_MODES.VOICE:
          return (
            <VoiceInterviewUI
              sessionData={{
                ...sessionData,
                timeRemaining: 900, // 15 minutes default, TODO: calculate actual remaining time
              }}
              currentQuestion={sessionData.currentQuestion}
              keyPoints={sessionData.keyPoints}
              isProcessingResponse={false}
              onSendVoiceInput={handleSendVoiceInput}
              onPause={handleSave}
              onEnd={handleEnd}
            />
          );
        
        case INTERVIEW_MODES.AVATAR:
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  Avatar Mode Coming Soon
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Avatar interviews will be available in the next update.
                </p>
              </div>
            </div>
          );
        
        default:
          return (
            <TextInterviewUI
              sessionData={mappedSessionData}
              userInput={userInput}
              setUserInput={setUserInput}
              onSubmitResponse={handleSendMessage}
              isLoading={submitResponse.isPending}
              onGetNextTopic={handleGetNextTopic}
              isGettingNextTopic={getNextTopicalQuestion.isPending}
              onSave={handleSave}
              onEnd={handleEnd}
              isSaving={false} // Temporary: was updateSessionState.isPending
              isEnding={false} // Temporary: was updateSessionState.isPending
            />
          );
      }
    };

    return (
      <div className="h-screen bg-white dark:bg-slate-900 flex flex-col">
        {renderInterviewMode()}
        
        {/* Floating Question Generator Button */}
        <button
          onClick={handleGenerateQuestion}
          disabled={isGeneratingQuestion}
          className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
          title={`Generate a question (${generatedQuestion ? 1 : 0} generated so far)`}
        >
          {isGeneratingQuestion ? (
            <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </button>

        {/* Question Generator Modal - Now inside active session */}
        {showQuestionGenerator && generatedQuestion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  🚀 Generated Question ({generatedQuestion.questionType})
                </h2>
                <button
                  onClick={() => setShowQuestionGenerator(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Question:</h3>
                  <p className="text-gray-800 dark:text-gray-200 text-lg bg-gray-50 dark:bg-slate-700 p-4 rounded border">
                    {generatedQuestion.question}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-3">Key Points to Address:</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-4 rounded border">
                    {generatedQuestion.keyPoints.map((point, index) => (
                      <li key={index} className="leading-relaxed">{point}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded border">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Difficulty</div>
                    <div className="text-gray-600 dark:text-gray-400 capitalize">{generatedQuestion.metadata.difficulty}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded border">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Est. Time</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {Math.floor(generatedQuestion.metadata.estimatedResponseTime / 60)} minutes
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded border">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Tags</div>
                    <div className="text-gray-600 dark:text-gray-400">{generatedQuestion.metadata.tags.join(', ')}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowQuestionGenerator(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowQuestionGenerator(false);
                    void handleGenerateQuestion();
                  }}
                  disabled={isGeneratingQuestion}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Generate Another
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-4 left-4 bg-black/75 text-white text-xs px-2 py-1 rounded">
            Mode: {mode} | Session: {sessionId} | State: {sessionState}
          </div>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div className="h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  );
} 