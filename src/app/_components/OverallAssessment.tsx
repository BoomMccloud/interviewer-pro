import { type OverallAssessment, type Persona } from '~/types';

interface OverallAssessmentProps {
  assessmentData: OverallAssessment & {
    persona: Persona | null;
    durationInSeconds: number;
  };
}

/**
 * A component to display the high-level summary of an interview report,
 * including persona, duration, and competency assessments.
 */
export default function OverallAssessment({ assessmentData }: OverallAssessmentProps) {
  const { persona, durationInSeconds, overallFit } = assessmentData;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        Overall Assessment
      </h2>
      
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Competency Fit</h3>
        <ul className="mt-2 space-y-3">
          {overallFit.map((fit, index) => (
            <li key={index} className="flex items-start">
              <div className="ml-3">
                <p className="font-semibold text-gray-800 dark:text-gray-200">{fit.competency}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{fit.assessment}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 