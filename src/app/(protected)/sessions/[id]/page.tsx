'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '~/trpc/react';
import TextInterviewUI from '~/components/Sessions/InterviewUI/TextInterviewUI';
import LiveVoiceInterviewUI from '~/components/Sessions/InterviewUI/LiveVoiceInterviewUI';
import { INTERVIEW_MODES, SESSION_STATES, PERSONA_IDS } from '~/types';
import type { InterviewMode, SessionState, GeneratedQuestion, PersonaId } from '~/types';
import { getPersona } from '~/lib/personaService';

export default function SessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const sessionId = params.id as string;
  const mode = (searchParams.get('mode') ?? 'text') as InterviewMode;
  
  const [userInput, setUserInput] = useState('');
  const [isGettingNextTopic, setIsGettingNextTopic] = useState(false);

  // Get session data
  const { data: session, isLoading, refetch } = api.session.getSessionById.useQuery({ sessionId });
  
  // Session mutations
  const submitResponseMutation = api.session.submitResponse.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const getNextTopicMutation = api.session.getNextTopicalQuestion.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const saveSessionMutation = api.session.saveSession.useMutation();
  const endSessionMutation = api.session.saveSession.useMutation({
    onSuccess: () => {
      router.push(`/sessions/${sessionId}/report`);
    },
  });

  // Handle response submission
  const handleSubmitResponse = async (response: string) => {
    await submitResponseMutation.mutateAsync({
      sessionId,
      userResponse: response,
    });
  };

  // Handle getting next topic
  const handleGetNextTopic = async () => {
    setIsGettingNextTopic(true);
    try {
      await getNextTopicMutation.mutateAsync({ sessionId });
    } finally {
      setIsGettingNextTopic(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    await saveSessionMutation.mutateAsync({ sessionId });
  };

  // Handle end
  const handleEnd = async () => {
    await endSessionMutation.mutateAsync({ sessionId, endSession: true });
  };

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  // Prepare session data for components
  const sessionData = {
    sessionId: session.id,
    history: session.conversationHistory || [],
    currentQuestion: session.currentQuestion || 'Loading next question...',
    keyPoints: session.keyPoints || [],
    status: session.status as 'active' | 'paused' | 'completed',
    startTime: session.startTime,
    personaName: session.personaId ? getPersona(session.personaId as PersonaId)?.name : undefined,
    personaId: session.personaId || 'default',
    isActive: session.status === 'active',
    conversationHistory: session.conversationHistory || [],
    questionNumber: session.questionNumber || 1,
    timeRemaining: 3600, // Default 1 hour
  };

  // Render appropriate UI based on mode
  if (mode === 'voice') {
    return (
      <LiveVoiceInterviewUI
        sessionData={sessionData}
        currentQuestion={sessionData.currentQuestion}
        onEnd={handleEnd}
      />
    );
  }

  // Default to text mode
  return (
    <TextInterviewUI
      sessionData={sessionData}
      userInput={userInput}
      setUserInput={setUserInput}
      onSubmitResponse={handleSubmitResponse}
      isLoading={submitResponseMutation.isPending}
      onGetNextTopic={handleGetNextTopic}
      isGettingNextTopic={isGettingNextTopic}
      onSave={handleSave}
      onEnd={handleEnd}
      isSaving={saveSessionMutation.isPending}
      isEnding={endSessionMutation.isPending}
    />
  );
} 