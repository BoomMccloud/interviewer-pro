'use client';

import { useState } from 'react';
import { type QuestionSegment } from '~/types';
import { api } from '~/trpc/react';
import Spinner from '~/components/UI/Spinner';
import InitialFeedbackDisplay from './InitialFeedbackDisplay';
import FormattedStarAnswer from './FormattedStarAnswer';

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
          <div className="space-y-6">
            <InitialFeedbackDisplay feedback={initialFeedback} />
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Example Answer:</h4>
              <div className="prose prose-sm mt-2 max-w-none rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800 dark:prose-invert">
                <FormattedStarAnswer text={initialFeedback.suggestedAnswer} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
} 