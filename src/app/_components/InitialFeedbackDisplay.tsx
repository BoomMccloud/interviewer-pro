import { LightbulbIcon, MessageCircleIcon, SparklesIcon } from 'lucide-react';

interface InitialFeedbackDisplayProps {
  feedback: {
    contentFeedback: string;
    clarityFeedback: string;
    confidenceFeedback: string;
  };
}

/**
 * A component to render the structured initial feedback from the AI
 * in a user-friendly format with icons and clear headings.
 */
export default function InitialFeedbackDisplay({ feedback }: InitialFeedbackDisplayProps) {
  const { contentFeedback, clarityFeedback, confidenceFeedback } = feedback;

  return (
    <div>
      <h4 className="font-semibold text-gray-800 dark:text-gray-200">Initial Feedback:</h4>
      <div className="mt-3 space-y-4">
        <div className="flex items-start">
          <LightbulbIcon className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div className="ml-3">
            <h5 className="font-semibold text-gray-700 dark:text-gray-300">Content & Relevance</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">{contentFeedback}</p>
          </div>
        </div>
        <div className="flex items-start">
          <MessageCircleIcon className="h-5 w-5 flex-shrink-0 text-blue-500" />
          <div className="ml-3">
            <h5 className="font-semibold text-gray-700 dark:text-gray-300">Clarity & Structure</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">{clarityFeedback}</p>
          </div>
        </div>
        <div className="flex items-start">
          <SparklesIcon className="h-5 w-5 flex-shrink-0 text-purple-500" />
          <div className="ml-3">
            <h5 className="font-semibold text-gray-700 dark:text-gray-300">Confidence & Delivery</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">{confidenceFeedback}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 