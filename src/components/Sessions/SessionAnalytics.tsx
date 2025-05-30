/**
 * SessionAnalytics Component - Displays performance metrics and analytics
 * 
 * Shows detailed performance insights including:
 * - Performance score and metrics
 * - Response time analysis
 * - Session completion statistics
 * - Visual charts and indicators
 */

import React from 'react';
import type { SessionAnalyticsData } from '~/types';

interface SessionAnalyticsProps {
  analytics: SessionAnalyticsData;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

function MetricCard({ title, value, subtitle, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
    red: 'text-red-600 bg-red-50 border-red-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-center">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm font-medium mt-1">{title}</div>
        {subtitle && (
          <div className="text-xs opacity-75 mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

interface PerformanceBarProps {
  score: number;
  label: string;
}

function PerformanceBar({ score, label }: PerformanceBarProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">{score}/100</span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            score >= 80 ? 'bg-green-100 text-green-800' :
            score >= 60 ? 'bg-yellow-100 text-yellow-800' :
            score >= 40 ? 'bg-orange-100 text-orange-800' :
            'bg-red-100 text-red-800'
          }`}>
            {getScoreLabel(score)}
          </span>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className={`h-3 rounded-full transition-all duration-500 ${getScoreColor(score)}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        ></div>
      </div>
    </div>
  );
}

export default function SessionAnalytics({ analytics }: SessionAnalyticsProps) {
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const formatResponseTime = (seconds: number): string => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${Math.round(seconds)}s`;
  };

  const getPerformanceLevel = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: 'Excellent Performance', color: 'text-green-600' };
    if (score >= 60) return { label: 'Good Performance', color: 'text-blue-600' };
    if (score >= 40) return { label: 'Fair Performance', color: 'text-yellow-600' };
    return { label: 'Needs Improvement', color: 'text-red-600' };
  };

  const performanceLevel = getPerformanceLevel(analytics.performanceScore);

  // Calculate response time distribution
  const responseTimeStats = analytics.responseTimeMetrics.length > 0 ? {
    fastest: Math.min(...analytics.responseTimeMetrics),
    slowest: Math.max(...analytics.responseTimeMetrics),
    median: analytics.responseTimeMetrics.sort()[Math.floor(analytics.responseTimeMetrics.length / 2)] ?? 0
  } : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Performance Analytics</h2>
            <p className="text-sm text-gray-600 mt-1">
              Detailed performance metrics and insights
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">{analytics.performanceScore}</div>
            <div className={`text-sm font-medium ${performanceLevel.color}`}>
              {performanceLevel.label}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Session Duration"
            value={formatDuration(analytics.sessionDurationMinutes)}
            subtitle="Total time spent"
            color="blue"
          />
          <MetricCard
            title="Questions"
            value={analytics.totalQuestions}
            subtitle="Total asked"
            color="green"
          />
          <MetricCard
            title="Responses"
            value={analytics.totalAnswers}
            subtitle="Completed"
            color="purple"
          />
          <MetricCard
            title="Completion"
            value={`${Math.round(analytics.completionPercentage)}%`}
            subtitle="Session progress"
            color={analytics.completionPercentage >= 80 ? 'green' : 
                   analytics.completionPercentage >= 50 ? 'orange' : 'red'}
          />
        </div>

        {/* Performance Score Breakdown */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Score</h3>
          <PerformanceBar score={analytics.performanceScore} label="Overall Performance" />
        </div>

        {/* Response Time Analysis */}
        {responseTimeStats && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time Analysis</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <MetricCard
                title="Average"
                value={formatResponseTime(analytics.averageResponseTime)}
                subtitle="Response time"
                color="blue"
              />
              <MetricCard
                title="Fastest"
                value={formatResponseTime(responseTimeStats.fastest)}
                subtitle="Quick response"
                color="green"
              />
              <MetricCard
                title="Median"
                value={formatResponseTime(responseTimeStats.median)}
                subtitle="Typical response"
                color="purple"
              />
              <MetricCard
                title="Slowest"
                value={formatResponseTime(responseTimeStats.slowest)}
                subtitle="Longest response"
                color="orange"
              />
            </div>

            {/* Response Time Distribution */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Response Time Distribution</h4>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {analytics.responseTimeMetrics.map((time, index) => (
                  <div key={index} className="text-center">
                    <div className={`h-8 rounded ${
                      time <= 30 ? 'bg-green-200' :
                      time <= 60 ? 'bg-yellow-200' :
                      time <= 120 ? 'bg-orange-200' :
                      'bg-red-200'
                    }`} style={{ 
                      height: `${Math.max(8, (time / Math.max(...analytics.responseTimeMetrics)) * 32)}px` 
                    }}></div>
                    <div className="mt-1 text-gray-600">{Math.round(time)}s</div>
                  </div>
                )).slice(0, 8)}
                {analytics.responseTimeMetrics.length > 8 && (
                  <div className="text-center text-gray-500">
                    +{analytics.responseTimeMetrics.length - 8} more
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Key Insights */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Key Insights</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• You answered {analytics.totalAnswers} out of {analytics.totalQuestions} questions</li>
            <li>• Your average response time was {formatResponseTime(analytics.averageResponseTime)}</li>
            <li>• Session lasted {formatDuration(analytics.sessionDurationMinutes)} in total</li>
            <li>• Performance score: {analytics.performanceScore}/100 ({performanceLevel.label.toLowerCase()})</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 