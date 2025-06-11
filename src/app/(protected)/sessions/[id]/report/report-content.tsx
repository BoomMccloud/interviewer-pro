"use client";

/**
 * SessionReportContent - Client component for session report functionality
 * 
 * Separated from the main page component to handle tRPC client-side hooks
 * while keeping the main page as a server component for Next.js 15 compatibility
 */

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '~/trpc/react';
import Spinner from '~/components/UI/Spinner';
import SessionOverview from '~/components/Sessions/SessionOverview';
import SessionTimeline from '~/components/Sessions/SessionTimeline';
import SessionAnalytics from '~/components/Sessions/SessionAnalytics';
import SessionFeedback from '~/components/Sessions/SessionFeedback';
import OverallAssessment from '~/app/_components/OverallAssessment';
import { useMemo } from 'react';
import { zodQuestionSegmentArray, type QuestionSegment } from '~/types';
import QuestionFeedbackSection from '~/app/_components/QuestionFeedbackSection';

/**
 * Main container for the session report page.
 * It fetches the overall assessment and will orchestrate the display of different report sections.
 */
export default function SessionReportContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const {
    data: assessmentData,
    isLoading: assessmentLoading,
    error: assessmentError,
  } = api.report.getOverallAssessment.useQuery({ sessionId: params.id });

  const {
    data: sessionData,
    isLoading: sessionLoading,
    error: sessionError,
  } = api.session.getSessionById.useQuery({ sessionId: params.id });

  if (assessmentLoading || sessionLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Spinner />
        </div>
    );
  }

  const error = assessmentError ?? sessionError;
  if (error) {
    return (
        <div className="flex h-screen flex-col items-center justify-center">
            <h1 className="text-2xl font-bold text-red-600">Error loading report</h1>
            <p className="mt-2 text-gray-600">{error.message}</p>
        </div>
    );
  }

  if (!assessmentData || !sessionData) {
    return <div>No assessment data found.</div>;
  }

  // Safely parse the question segments
  const questionSegments = zodQuestionSegmentArray.safeParse(sessionData.questionSegments);

  return (
    <div className="mx-auto max-w-4xl bg-white p-4 dark:bg-slate-900 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        Interview Report
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Session ID: {params.id}
      </p>

      <div className="mt-8">
        <OverallAssessment assessmentData={assessmentData} />
      </div>

      <div className="mt-10 space-y-8">
        {questionSegments.success && questionSegments.data.map((segment) => (
          <QuestionFeedbackSection key={segment.questionId} segment={segment} sessionId={params.id} />
        ))}
      </div>
    </div>
  );
} 