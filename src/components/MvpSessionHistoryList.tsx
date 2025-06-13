/**
 * @fileoverview MVP Session History List component.
 * Displays a list of past interview sessions for the current JD/Resume text.
 * Key functions: formatDate, formatDuration, session navigation.
 */

'use client';

import React from 'react';
import type { SessionData, MvpSessionTurn } from '~/types';

interface MvpSessionHistoryListProps {
  sessions: (Omit<SessionData, 'history'> & { history: MvpSessionTurn[] })[];
  onSessionClick?: (sessionId: string) => void;
  isLoading?: boolean;
}

export default function MvpSessionHistoryList({
  sessions,
  onSessionClick,
  isLoading = false,
}: MvpSessionHistoryListProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
  };

  const getSessionStatus = (session: Omit<SessionData, 'history'> & { history: MvpSessionTurn[] }) => {
    if (session.endTime) {
      return 'Completed';
    }
    return 'In Progress';
  };



  const handleSessionClick = (sessionId: string) => {
    if (onSessionClick) {
      onSessionClick(sessionId);
    } else {
      // Default navigation to session report
      window.location.href = `/sessions/${sessionId}/report`;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded-md"></div>
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-lg">No interview sessions yet</p>
        <p className="text-sm">Start your first interview to see sessions here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          onClick={() => handleSessionClick(session.id)}
          className="p-4 border border-gray-200 rounded-md hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
          data-testid="session-item"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Interview Session
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {formatDate(session.startTime)}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-2 py-1 text-xs rounded-full ${
                  session.endTime
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {getSessionStatus(session)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
            <div className="flex gap-4">
              {session.endTime && (
                <span>
                  Duration: {formatDuration(Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000))}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                View Report
              </span>
              <svg 
                className="w-4 h-4 text-blue-600 dark:text-blue-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {session.overallSummary && (
            <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
              <p className="line-clamp-2">{session.overallSummary}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 