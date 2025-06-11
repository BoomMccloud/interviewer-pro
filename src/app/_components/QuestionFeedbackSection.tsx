'use client';

import { useState } from 'react';
import { type QuestionSegment } from '~/types';
import { api } from '~/trpc/react';
import Spinner from '~/components/UI/Spinner';
import InteractiveCoach from './InteractiveCoach';

interface QuestionFeedbackSectionProps {
  segment: QuestionSegment;
  sessionId: string;
}

/**
 * A stateful component that displays a single question from the interview
 * and allows the user to fetch feedback and start a coaching session.
 */
export default function QuestionFeedbackSection({ segment, sessionId }: QuestionFeedbackSectionProps) {
  const [showFeedback, setShowFeedback] = useState(false);

  const { data: initialFeedback, isLoading, error } = api.report.getQuestionInitialFeedback.useQuery({
    sessionId: sessionId,
    questionId: segment.questionId,
  }, {
    enabled: showFeedback, // Only fetch when the user clicks the button
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {segment.questionNumber}. {segment.question}
      </h3>
      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        <p className="font-semibold">Your Answer:</p>
        <p className="mt-1 italic">
          {segment.conversation.find(turn => turn.role === 'user')?.content ?? 'No answer recorded.'}
        </p>
      </div>

      <div className="mt-4">
        {!showFeedback ? (
          <button
            onClick={() => setShowFeedback(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Get Feedback
          </button>
        ) : isLoading ? (
          <Spinner />
        ) : error ? (
          <p className="text-red-600">{error.message}</p>
        ) : initialFeedback ? (
          <div>
            <h4 className="font-semibold">Initial Feedback:</h4>
            <pre className="mt-2 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
              {JSON.stringify(initialFeedback, null, 2)}
            </pre>
            <InteractiveCoach sessionId={sessionId} questionId={segment.questionId} />
          </div>
        ) : null}
      </div>
    </div>
  );
} 