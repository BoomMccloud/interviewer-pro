"use client";

/**
 * SessionTimeline Component - Displays chronological conversation flow
 * 
 * Shows the complete interview conversation including:
 * - Question-answer exchanges in chronological order
 * - Response time indicators
 * - Expandable content for long responses
 * - Timestamps and conversation flow
 */

import React, { useState } from 'react';
import type { MvpSessionTurn } from '~/types';

interface SessionTimelineProps {
  history: MvpSessionTurn[];
}

interface QuestionAnswerCardProps {
  turn: MvpSessionTurn;
  responseTime?: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function QuestionAnswerCard({ turn, responseTime, isExpanded, onToggleExpand }: QuestionAnswerCardProps) {
  const isAI = turn.role === 'model';
  const isLongContent = turn.text.length > 200;
  const displayText = isExpanded || !isLongContent 
    ? turn.text 
    : `${turn.text.substring(0, 200)}...`;

  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(date));
  };

  const getResponseTimeBadge = () => {
    if (!responseTime) return null;
    
    const getResponseTimeColor = (time: number) => {
      if (time <= 30) return 'bg-green-100 text-green-800';
      if (time <= 60) return 'bg-yellow-100 text-yellow-800';
      if (time <= 120) return 'bg-orange-100 text-orange-800';
      return 'bg-red-100 text-red-800';
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getResponseTimeColor(responseTime)}`}>
        {Math.round(responseTime)}s
      </span>
    );
  };

  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-3xl ${isAI ? 'mr-auto' : 'ml-auto'}`}>
        {/* Message Bubble */}
        <div 
          className={`rounded-lg px-4 py-3 ${
            isAI 
              ? 'bg-blue-50 border border-blue-200' 
              : 'bg-gray-50 border border-gray-200'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isAI ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {isAI ? '🤖 AI Interviewer' : '👤 You'}
              </span>
              <span className="text-xs text-gray-500">{formatTime(turn.timestamp)}</span>
              {getResponseTimeBadge()}
            </div>
          </div>

          {/* Content */}
          <div className="text-gray-900">
            <p className="whitespace-pre-wrap leading-relaxed">{displayText}</p>
            
            {isLongContent && (
              <button
                onClick={onToggleExpand}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {isExpanded ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>

          {/* AI Analysis (if available) */}
          {isAI && turn.analysis && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="text-sm">
                <span className="font-medium text-blue-800">Analysis:</span>
                <p className="text-blue-700 mt-1">{turn.analysis}</p>
              </div>
            </div>
          )}

          {/* Feedback Points (if available) */}
          {isAI && turn.feedbackPoints && turn.feedbackPoints.length > 0 && (
            <div className="mt-2">
              <span className="text-sm font-medium text-blue-800">Feedback:</span>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                {turn.feedbackPoints.map((point, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Alternative (if available) */}
          {isAI && turn.suggestedAlternative && (
            <div className="mt-2">
              <span className="text-sm font-medium text-blue-800">Suggestion:</span>
              <p className="text-sm text-blue-700 mt-1 italic">&ldquo;{turn.suggestedAlternative}&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SessionTimeline({ history }: SessionTimelineProps) {
  const [expandedTurns, setExpandedTurns] = useState<Set<string>>(new Set());

  const toggleExpand = (turnId: string) => {
    const newExpanded = new Set(expandedTurns);
    if (newExpanded.has(turnId)) {
      newExpanded.delete(turnId);
    } else {
      newExpanded.add(turnId);
    }
    setExpandedTurns(newExpanded);
  };

  // Calculate response times
  const getResponseTime = (index: number): number | undefined => {
    if (index === 0) return undefined;
    
    const currentTurn = history[index];
    const previousTurn = history[index - 1];
    
    if (currentTurn?.role === 'user' && previousTurn?.role === 'model') {
      return (new Date(currentTurn.timestamp).getTime() - new Date(previousTurn.timestamp).getTime()) / 1000;
    }
    
    return undefined;
  };

  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Timeline</h2>
        <p className="text-gray-600">No conversation history available for this session.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Session Timeline</h2>
        <p className="text-sm text-gray-600 mt-1">
          Complete conversation history ({history.length} exchanges)
        </p>
      </div>

      {/* Timeline Content */}
      <div className="p-6">
        <div className="space-y-1">
          {history.map((turn, index) => (
            <QuestionAnswerCard
              key={turn.id}
              turn={turn}
              responseTime={getResponseTime(index)}
              isExpanded={expandedTurns.has(turn.id)}
              onToggleExpand={() => toggleExpand(turn.id)}
            />
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {history.filter(turn => turn.role === 'model').length}
              </div>
              <div className="text-gray-600">AI Questions</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {history.filter(turn => turn.role === 'user').length}
              </div>
              <div className="text-gray-600">Your Responses</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {history.length}
              </div>
              <div className="text-gray-600">Total Exchanges</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {history.filter(turn => Boolean(turn.analysis) || (turn.feedbackPoints?.length ?? 0) > 0).length}
              </div>
              <div className="text-gray-600">With Analysis</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 