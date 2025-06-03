'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { PERSONA_IDS } from '~/types';
import type { GeneratedQuestion } from '~/types';

export default function TestQuestionApiPage() {
  const [question, setQuestion] = useState<GeneratedQuestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get user's JD/Resume data for question generation
  const { data: jdResumeText } = api.jdResume.getJdResumeText.useQuery();
  
  // Set up the question generation query with enabled: false
  const generateQuestionQuery = api.session.generateInterviewQuestion.useQuery(
    {
      jdResumeTextId: jdResumeText?.id ?? '',
      personaId: PERSONA_IDS.HR_RECRUITER_GENERAL,
      questionType: 'opening',
    },
    {
      enabled: false, // Don't auto-fetch, only when manually triggered
    }
  );
  
  const handleGenerateQuestion = async () => {
    if (!jdResumeText?.id) {
      alert('Please save your JD/Resume first on the dashboard');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateQuestionQuery.refetch();
      
      if (result.data) {
        setQuestion(result.data);
      }
    } catch (error) {
      console.error('Failed to generate question:', error);
      alert('Failed to generate question. Check console for details.');
    }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🚀 Question Generation API Test
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Testing the new dedicated generateInterviewQuestion API
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-8">
          {!jdResumeText ? (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No JD/Resume data found. Please save your data on the dashboard first.
              </p>
              <a
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                Go to Dashboard
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Generate Interview Question
                </h2>
                <button
                  onClick={handleGenerateQuestion}
                  disabled={isGenerating}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating Question...' : 'Generate Opening Question'}
                </button>
              </div>

              {question && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
                    Generated Question ({question.questionType})
                  </h3>
                  
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Question:</h4>
                    <p className="text-gray-800 dark:text-gray-200 text-lg bg-white dark:bg-slate-800 p-4 rounded border">
                      {question.question}
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">Key Points to Address:</h4>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 p-4 rounded border">
                      {question.keyPoints.map((point, index) => (
                        <li key={index} className="leading-relaxed">{point}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded border">
                      <div className="font-medium text-gray-900 dark:text-gray-100">Difficulty</div>
                      <div className="text-gray-600 dark:text-gray-400 capitalize">{question.metadata.difficulty}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-3 rounded border">
                      <div className="font-medium text-gray-900 dark:text-gray-100">Est. Time</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {Math.floor(question.metadata.estimatedResponseTime / 60)} minutes
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-3 rounded border">
                      <div className="font-medium text-gray-900 dark:text-gray-100">Tags</div>
                      <div className="text-gray-600 dark:text-gray-400">{question.metadata.tags.join(', ')}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">API Response Info:</h5>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div>Persona ID: {question.personaId}</div>
                      <div>Question Type: {question.questionType}</div>
                      <div>Has Raw AI Response: {question.rawAiResponse ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 