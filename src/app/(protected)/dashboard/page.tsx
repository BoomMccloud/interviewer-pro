/**
 * @fileoverview The main dashboard page for authenticated users.
 * Displays the JD/Resume input form and the user's session history.
 * Handles initial data loading and orchestrates interactions with child components using tRPC hooks.
 */

'use client'; // This is a client component

import React from 'react';
import { useRouter } from 'next/navigation';
import MvpJdResumeInputForm from '~/components/MvpJdResumeInputForm';
import MvpSessionHistoryList from '~/components/MvpSessionHistoryList';
import Spinner from '~/components/UI/Spinner';
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

  const handleJdResumeSaveSuccess = async () => {
    await Promise.all([
      refetchJdResume(),
      refetchSessions()
    ]);
  };

  const handleSessionCreated = () => {
    void refetchSessions(); // Don't await here as we're navigating away
  };

  // Show loading spinner while data is loading
  if (isLoadingJdResume || isLoadingSessions) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Show error state if any error occurred
  if (jdResumeError || sessionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Error Loading Dashboard</h1>
            <p className="mt-2 text-gray-600">
              {jdResumeError?.message ?? sessionsError?.message ?? 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Interview Practice Dashboard
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Practice your interview skills with AI-powered mock interviews tailored to your target role.
          </p>
        </div>

        <div className="space-y-8">
          {/* JD/Resume Input Section */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Job Description & Resume
            </h2>
            <MvpJdResumeInputForm 
              initialJdText={jdResumeText?.jdText}
              initialResumeText={jdResumeText?.resumeText}
              onSaveSuccess={handleJdResumeSaveSuccess}
              onStartSessionSuccess={handleSessionCreated}
            />
          </div>

          {/* Session History Section */}
          {jdResumeText && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                Your Interview Sessions
              </h2>
              <MvpSessionHistoryList 
                sessions={sessionHistory}
                onSessionClick={(sessionId) => router.push(`/sessions/${sessionId}`)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 