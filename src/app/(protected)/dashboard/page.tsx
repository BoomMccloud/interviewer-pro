/**
 * @fileoverview The main dashboard page for authenticated users.
 * Displays the JD/Resume input form and the user's session history.
 * Handles initial data loading and orchestrates interactions with child components using tRPC hooks.
 */

'use client'; // This is a client component

import React from 'react';
import { useRouter } from 'next/navigation';

// Real components
import MvpJdResumeInputForm from '~/components/MvpJdResumeInputForm';
import MvpSessionHistoryList from '~/components/MvpSessionHistoryList';
import Spinner from '~/components/UI/Spinner';

// tRPC hooks and types
import { api } from '~/trpc/react';
import type { MvpSessionTurn } from '~/types';
import { zodMvpSessionTurnArray } from '~/types';

export default function DashboardPage() {
  const router = useRouter();
  const utils = api.useUtils();

  // Fetch data using tRPC hooks with proper patterns
  const { 
    data: jdResumeText, 
    isLoading: isLoadingJdResume, 
    error: jdResumeError,
    refetch: refetchJdResume
  } = api.jdResume.getJdResumeText.useQuery();

  const { 
    data: rawSessionHistory = [], 
    isLoading: isLoadingSessions, 
    error: sessionsError,
    refetch: refetchSessions
  } = api.session.listForCurrentText.useQuery();

  // Transform session history to match component expectations
  const sessionHistory = React.useMemo(() => {
    return rawSessionHistory.map(session => {
      let history: MvpSessionTurn[] = [];
      if (session.history) {
        try {
          history = zodMvpSessionTurnArray.parse(session.history);
        } catch (error) {
          console.error('Failed to parse session history:', error);
          history = [];
        }
      }
      return {
        ...session,
        history,
      };
    });
  }, [rawSessionHistory]);

  // Combined loading and error states
  const isLoading = isLoadingJdResume || isLoadingSessions;
  const error = jdResumeError ?? sessionsError;

  // Handlers for form interactions
  const handleSaveSuccess = async () => {
    // Invalidate and refetch both queries when text is saved
    await utils.jdResume.getJdResumeText.invalidate();
    await utils.session.listForCurrentText.invalidate();
  };

  const handleStartSessionSuccess = () => {
    // Navigation is handled by the MvpJdResumeInputForm component
    // We could also invalidate queries here if needed
  };

  const handleSessionClick = (sessionId: string) => {
    router.push(`/sessions/${sessionId}/report`);
  };

  const handleRetry = async () => {
    await Promise.all([
      refetchJdResume(),
      refetchSessions(),
    ]);
  };

  // Show loading spinner while data is loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading dashboard:</p>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        
        {/* Job Description & Resume Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Job Description & Resume</h2>
          <MvpJdResumeInputForm
            initialJdText={jdResumeText?.jdText ?? ''}
            initialResumeText={jdResumeText?.resumeText ?? ''}
            onSaveSuccess={handleSaveSuccess}
            onStartSessionSuccess={handleStartSessionSuccess}
          />
        </div>

        {/* Session History Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Session History</h2>
          <MvpSessionHistoryList
            sessions={sessionHistory}
            onSessionClick={handleSessionClick}
            isLoading={false} // Loading handled at page level
          />
        </div>
      </div>
    </div>
  );
} 