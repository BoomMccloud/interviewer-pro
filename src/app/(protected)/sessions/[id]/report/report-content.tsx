"use client";

/**
 * SessionReportContent - Client component for session report functionality
 * 
 * Separated from the main page component to handle tRPC client-side hooks
 * while keeping the main page as a server component for Next.js 15 compatibility
 */

import React from 'react';
import { api } from '~/trpc/react';
import Spinner from '~/components/UI/Spinner';
import SessionOverview from '~/components/Sessions/SessionOverview';
import SessionTimeline from '~/components/Sessions/SessionTimeline';
import SessionAnalytics from '~/components/Sessions/SessionAnalytics';
import SessionFeedback from '~/components/Sessions/SessionFeedback';

interface SessionReportContentProps {
  sessionId: string;
}

export function SessionReportContent({ sessionId }: SessionReportContentProps) {
  // Fetch session data using our new tRPC procedures
  const { 
    data: sessionReport, 
    isLoading: reportLoading, 
    error: reportError 
  } = api.session.getSessionReport.useQuery({ sessionId });

  const { 
    data: sessionAnalytics, 
    isLoading: analyticsLoading, 
    error: analyticsError 
  } = api.session.getSessionAnalytics.useQuery({ sessionId });

  const { 
    data: sessionFeedback, 
    isLoading: feedbackLoading, 
    error: feedbackError 
  } = api.session.getSessionFeedback.useQuery({ sessionId });

  // Show loading state
  if (reportLoading || analyticsLoading || feedbackLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Spinner />
        <p className="mt-4 text-gray-600">Loading session report...</p>
      </div>
    );
  }

  // Show error if main session report fails
  if (reportError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Report</h1>
          <p className="text-red-600 mb-4">{reportError.message}</p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Report loaded successfully
  if (!sessionReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-600">Session report not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Report</h1>
        <p className="text-gray-600">
          Detailed analysis of your interview session performance
        </p>
      </div>

      {/* Session Overview Section */}
      <div className="mb-8">
        <SessionOverview report={sessionReport} />
      </div>

      {/* Session Timeline Section */}
      <div className="mb-8">
        <SessionTimeline history={sessionReport.history} />
      </div>

      {/* Analytics Section */}
      <div className="mb-8">
        {sessionAnalytics ? (
          <SessionAnalytics analytics={sessionAnalytics} />
        ) : analyticsError ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Analytics Unavailable</h3>
            <p className="text-yellow-700">{analyticsError.message}</p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        )}
      </div>

      {/* Feedback Section */}
      <div className="mb-8">
        {sessionFeedback ? (
          <SessionFeedback feedback={sessionFeedback} />
        ) : feedbackError ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Feedback Unavailable</h3>
            <p className="text-yellow-700">{feedbackError.message}</p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600">Loading feedback...</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-8 border-t border-gray-200">
        <button 
          onClick={() => window.history.back()}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
        >
          ← Back to Sessions
        </button>
        
        <div className="space-x-2">
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Export Report
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Retake Interview
          </button>
        </div>
      </div>
    </div>
  );
} 