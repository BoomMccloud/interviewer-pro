'use client';

import { useState, useRef, useEffect } from 'react';
import { api, type RouterOutputs } from '~/trpc/react';
import Spinner from '~/components/UI/Spinner';
import { type FeedbackConversation } from '~/types';

type FeedbackConversationOutput = RouterOutputs['report']['startOrGetFeedbackConversation'];

interface InteractiveCoachProps {
  sessionId: string;
  questionId: string;
}

/**
 * A stateful component that manages and displays a stateful, text-based
 * conversation with an AI coach for a single question.
 */
export default function InteractiveCoach({ sessionId, questionId }: InteractiveCoachProps) {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<FeedbackConversation | null>(null);

  const { mutate: startConversation, isPending: isLoadingConversation } = 
    api.report.startOrGetFeedbackConversation.useMutation<FeedbackConversationOutput>({
      onSuccess: (data) => setConversation(data as FeedbackConversation),
      onError: (error) => console.error('Failed to start conversation', error),
    });

  useEffect(() => {
    startConversation({ sessionId, questionId });
  }, [sessionId, questionId, startConversation]);

  const postMutation = api.report.postToFeedbackConversation.useMutation({
    onSuccess: (updatedConversation) => {
      // Manually update the cache to show the new message instantly
      // This is an optimistic update pattern
    },
    onError: (error) => {
      console.error("Failed to post message:", error);
      alert("Error sending message. Please try again.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversation) return;
    
    postMutation.mutate({ conversationId: conversation.id, message });
    setMessage('');
  };

  if (isLoadingConversation) {
    return <div className="py-4"><Spinner /></div>;
  }

  if (!conversation) {
    return <div className="text-red-500">Could not load conversation.</div>;
  }

  return (
    <div className="mt-4 rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900">
      <h4 className="font-semibold text-gray-800 dark:text-gray-200">Interactive Coach</h4>
      <div className="mt-2 h-48 space-y-2 overflow-y-auto rounded-md bg-white p-2 dark:bg-gray-800">
        {/* Chat history will be rendered here */}
      </div>
      <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask a follow-up question..."
          className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          disabled={postMutation.isPending}
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          disabled={postMutation.isPending}
        >
          {postMutation.isPending ? <Spinner /> : 'Send'}
        </button>
      </form>
    </div>
  );
} 