/**
 * SessionFeedback Component - Displays AI-generated feedback and recommendations
 * 
 * Shows comprehensive feedback including:
 * - Overall performance score
 * - Identified strengths and areas for improvement
 * - Actionable recommendations
 * - Detailed analysis
 * - Skill assessment breakdown
 */

import React from 'react';
import type { SessionFeedbackData } from '~/types';

interface SessionFeedbackProps {
  feedback: SessionFeedbackData;
}

interface SkillBarProps {
  skill: string;
  score: number;
}

function SkillBar({ skill, score }: SkillBarProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreColorLight = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-blue-100 text-blue-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{skill}</span>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getScoreColorLight(score)}`}>
          {score}/100
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${getScoreColor(score)}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        ></div>
      </div>
    </div>
  );
}

interface FeedbackSectionProps {
  title: string;
  items: string[];
  color: 'green' | 'yellow' | 'blue';
  icon: string;
}

function FeedbackSection({ title, items, color, icon }: FeedbackSectionProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconColorClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center mb-3">
        <span className={`text-lg mr-2 ${iconColorClasses[color]}`}>{icon}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start">
            <span className={`text-sm mr-2 mt-0.5 ${iconColorClasses[color]}`}>•</span>
            <span className="text-sm">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SessionFeedback({ feedback }: SessionFeedbackProps) {
  const getOverallPerformanceLevel = (score: number): { label: string; color: string; bgColor: string } => {
    if (score >= 80) return { 
      label: 'Excellent Performance', 
      color: 'text-green-600', 
      bgColor: 'bg-green-50 border-green-200' 
    };
    if (score >= 60) return { 
      label: 'Good Performance', 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50 border-blue-200' 
    };
    if (score >= 40) return { 
      label: 'Fair Performance', 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-50 border-yellow-200' 
    };
    return { 
      label: 'Needs Improvement', 
      color: 'text-red-600', 
      bgColor: 'bg-red-50 border-red-200' 
    };
  };

  const performanceLevel = getOverallPerformanceLevel(feedback.overallScore);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Feedback & Analysis</h2>
            <p className="text-sm text-gray-600 mt-1">
              Personalized insights and recommendations for improvement
            </p>
          </div>
          <div className={`text-center p-3 rounded-lg border ${performanceLevel.bgColor}`}>
            <div className="text-2xl font-bold">{feedback.overallScore}</div>
            <div className={`text-sm font-medium ${performanceLevel.color}`}>
              Overall Score
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Overall Performance */}
        <div className={`rounded-lg border p-4 mb-6 ${performanceLevel.bgColor}`}>
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-3">🎯</span>
            <h3 className={`text-lg font-semibold ${performanceLevel.color}`}>
              {performanceLevel.label}
            </h3>
          </div>
          <p className={`text-sm ${performanceLevel.color}`}>
            You scored {feedback.overallScore} out of 100 in this interview session.
          </p>
        </div>

        {/* Detailed Analysis */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Detailed Analysis</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 leading-relaxed">{feedback.detailedAnalysis}</p>
          </div>
        </div>

        {/* Feedback Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <FeedbackSection
            title="Strengths"
            items={feedback.strengths}
            color="green"
            icon="✅"
          />
          <FeedbackSection
            title="Areas for Improvement"
            items={feedback.areasForImprovement}
            color="yellow"
            icon="📈"
          />
          <FeedbackSection
            title="Recommendations"
            items={feedback.recommendations}
            color="blue"
            icon="💡"
          />
        </div>

        {/* Skill Assessment */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Skill Assessment</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            {Object.entries(feedback.skillAssessment).map(([skill, score]) => (
              <SkillBar key={skill} skill={skill} score={score} />
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">🚀</span>
            <h3 className="text-lg font-semibold text-gray-900">Next Steps</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Immediate Actions</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {feedback.recommendations.slice(0, 2).map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Focus Areas</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {feedback.areasForImprovement.slice(0, 2).map((area, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-purple-500 mr-2">→</span>
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Continue Practice Button */}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <button className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Schedule Practice Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 