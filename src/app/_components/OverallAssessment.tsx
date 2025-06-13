import { type OverallAssessment, type Persona } from '~/types';
import { CheckCircle2, XCircle } from 'lucide-react';

interface OverallAssessmentProps {
  assessmentData: {
    assessment: OverallAssessment | null;
    persona: Persona | null;
    durationInSeconds: number;
  };
}

/**
 * A component to display the high-level summary of an interview report,
 * including persona, duration, summary, strengths, improvements, and score.
 */
export default function OverallAssessment({ assessmentData }: OverallAssessmentProps) {
  const { assessment, persona, durationInSeconds } = assessmentData;

  if (!assessment) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Overall Assessment
        </h2>
        <p className="mt-4 text-gray-700 dark:text-gray-300">No assessment data available.</p>
      </div>
    );
  }

  const { summary, strengths, improvements, score } = assessment;

  const scoreColorClass =
    score >= 8
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : score >= 5
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        Overall Assessment
      </h2>
      
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Interview Persona</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{persona?.name ?? 'N/A'}</p>
        </div>
        <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Duration</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {Math.round(durationInSeconds / 60)} minutes
          </p>
        </div>
        <div className={`rounded-md p-4 ${scoreColorClass}`}>
          <p className="text-sm font-medium">Overall Score</p>
          <p className="mt-1 text-2xl font-bold">{score}/10</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">AI Summary</h3>
        <p className="mt-2 text-gray-700 dark:text-gray-300">{summary}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-lg font-medium text-green-600 dark:text-green-400">Strengths</h3>
          <ul className="mt-2 space-y-3">
            {strengths.map((strength, index) => (
              <li key={index} className="flex items-start">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <p className="ml-2 text-gray-700 dark:text-gray-300">{strength}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-medium text-red-600 dark:text-red-400">Areas for Improvement</h3>
          <ul className="mt-2 space-y-3">
            {improvements.map((improvement, index) => (
              <li key={index} className="flex items-start">
                <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                <p className="ml-2 text-gray-700 dark:text-gray-300">{improvement}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 