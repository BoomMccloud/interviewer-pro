'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '~/trpc/react';
import TextInterviewUI from '~/components/Sessions/InterviewUI/TextInterviewUI';
import LiveVoiceInterviewUI from '~/components/Sessions/InterviewUI/LiveVoiceInterviewUI';
import type { InterviewMode, QuestionSegment, ConversationTurn } from '~/types';

export default function SessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const sessionId = params.id as string;
  const mode = (searchParams.get('mode') ?? 'text') as InterviewMode;
  
  const [userInput, setUserInput] = useState('');

  // Get session data
  const { data: session, isLoading, refetch } = api.session.getSessionById.useQuery({ sessionId });
  
  // Session mutations
  const submitResponseMutation = api.session.submitResponse.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const moveToNextMutation = api.session.moveToNextQuestion.useMutation({
    onSuccess: (data) => {
      if (data.isComplete) {
        // Interview is over, navigate to the report page
        router.push(`/sessions/${data.sessionId}/report`);
      } else {
        // Interview is ongoing, refetch data for the next question
        void refetch();
      }
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
  const handleMoveToNext = async () => {
    await moveToNextMutation.mutateAsync({ sessionId });
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

  // Current question and history from segments
  const questionSegments = (session.questionSegments as unknown) as QuestionSegment[] | null;
  const currentSegment = questionSegments?.[session.currentQuestionIndex] ?? null;

  // Prepare session data for components
  const sessionData = {
    sessionId: session.id,
    history: currentSegment?.conversation.map(turn => ({
      ...turn,
      timestamp: new Date(turn.timestamp),
    })) ?? [],
    currentQuestion: currentSegment?.question ?? 'Loading interview...',
    keyPoints: currentSegment?.keyPoints ?? [],
    status: session.status as 'active' | 'paused' | 'completed',
    startTime: session.startTime,
    personaName: session.personaId, // Use available personaId as a safe fallback
    personaId: session.personaId ?? 'default',
    isActive: session.status === 'active',
    questionNumber: session.currentQuestionIndex + 1,
    totalQuestions: questionSegments?.length ?? 0,
    timeRemaining: 3600, // Default 1 hour
  };

  // Render appropriate UI based on mode
  if (mode === 'voice') {
    return (
      <LiveVoiceInterviewUI
        sessionData={sessionData}
        currentQuestion={sessionData.currentQuestion}
        onMoveToNext={handleMoveToNext}
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
      onMoveToNext={handleMoveToNext}
      isGettingNextTopic={moveToNextMutation.isPending}
      onSave={handleSave}
      onEnd={handleEnd}
      isSaving={saveSessionMutation.isPending}
      isEnding={endSessionMutation.isPending}
    />
  );
} 