/**
 * SessionOverview Component - Displays session metadata and quick performance stats
 * 
 * Shows key information about the interview session including:
 * - Session duration and completion status
 * - Basic performance metrics 
 * - Quick stats overview
 * - Action buttons for export and retake
 */

import React from 'react';
import type { SessionReportData } from '~/types';

interface SessionOverviewProps {
  report: SessionReportData;
}

export default function SessionOverview({ report }: SessionOverviewProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Session Overview</h2>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Duration */}
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatDuration(report.durationInSeconds)}
            </div>
            <div className="text-sm text-gray-600">Session Duration</div>
          </div>

          {/* Questions Answered */}
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {report.questionCount}
            </div>
            <div className="text-sm text-gray-600">Questions Answered</div>
          </div>

          {/* Completion Rate */}
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(report.completionPercentage)}%
            </div>
            <div className="text-sm text-gray-600">Completion Rate</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Session Progress</span>
            <span className="text-sm text-gray-500">{Math.round(report.completionPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, report.completionPercentage)}%` }}
            ></div>
          </div>
        </div>

        {/* Session Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Created:</span>
            <span className="ml-2 text-gray-600">{formatDate(report.createdAt)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Updated:</span>
            <span className="ml-2 text-gray-600">{formatDate(report.updatedAt)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Average Response Time:</span>
            <span className="ml-2 text-gray-600">
              {report.averageResponseTime > 0 
                ? `${Math.round(report.averageResponseTime)}s` 
                : 'N/A'
              }
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Session ID:</span>
            <span className="ml-2 text-gray-600 font-mono text-xs">{report.sessionId}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-4 flex justify-start">
          <span 
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              report.completionPercentage >= 100 
                ? 'bg-green-100 text-green-800' 
                : report.completionPercentage >= 50
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {report.completionPercentage >= 100 
              ? 'Completed' 
              : report.completionPercentage >= 50
              ? 'Partially Completed'
              : 'Incomplete'
            }
          </span>
        </div>
      </div>
    </div>
  );
} 