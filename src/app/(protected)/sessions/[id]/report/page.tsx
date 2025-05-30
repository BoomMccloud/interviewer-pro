/**
 * Session Report Page - Displays comprehensive analysis of a completed interview session
 * 
 * This page provides users with detailed insights into their interview performance including:
 * - Session overview with basic metrics
 * - Interactive timeline of question-answer exchanges  
 * - Performance analytics and scoring
 * - AI-generated feedback and recommendations
 * 
 * Uses tRPC procedures: getSessionReport, getSessionAnalytics, getSessionFeedback
 */

import React from 'react';
import { SessionReportContent } from './report-content';

interface SessionReportPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SessionReportPage({ params }: SessionReportPageProps) {
  const { id: sessionId } = await params;

  return <SessionReportContent sessionId={sessionId} />;
} 