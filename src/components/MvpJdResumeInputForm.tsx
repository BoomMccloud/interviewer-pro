/**
 * @fileoverview MVP Job Description and Resume input form component.
 * Provides text areas for users to input JD and resume text, with save functionality
 * and ability to start a new interview session.
 * Key functions: handleSave, handleStartSession, form state management.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '~/trpc/react';
import type { JdResumeText } from '~/types';
import Spinner from '~/components/UI/Spinner';
import { PERSONA_IDS } from '~/types';

interface MvpJdResumeInputFormProps {
  initialJdText?: string;
  initialResumeText?: string;
  onSaveSuccess?: () => Promise<void> | void;
  onStartSessionSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function MvpJdResumeInputForm({
  initialJdText = '',
  initialResumeText = '',
  onSaveSuccess,
  onStartSessionSuccess,
  onError,
}: MvpJdResumeInputFormProps) {
  const router = useRouter();
  const [jdText, setJdText] = useState(initialJdText);
  const [resumeText, setResumeText] = useState(initialResumeText);
  const [lastSavedData, setLastSavedData] = useState<JdResumeText | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // tRPC hooks
  const saveJdResumeMutation = api.jdResume.saveJdResumeText.useMutation({
    onSuccess: async (data) => {
      setLastSavedData(data);
      setSaveStatus('saved');
      await onSaveSuccess?.();
      
      // Reset save status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: (error) => {
      console.error('Error saving JD/Resume text:', error);
      setSaveStatus('error');
      onError?.(`Failed to save: ${error.message}`);
      
      // Reset error status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  const createDraftSessionMutation = api.session.createDraftSession.useMutation();
  const startSessionMutation = api.session.startInterviewSession.useMutation({
    onSuccess: (data) => {
      router.push(`/sessions/${data.sessionId}`);
      onStartSessionSuccess?.();
    },
    onError: (error) => {
      console.error('Error starting session:', error);
      onError?.(`Failed to start session: ${error.message}`);
    },
  });

  // Update form when initial values change
  useEffect(() => {
    setJdText(initialJdText);
    setResumeText(initialResumeText);
  }, [initialJdText, initialResumeText]);

  const handleSave = () => {
    if (saveJdResumeMutation.isPending) return;
    
    setSaveStatus('saving');
    saveJdResumeMutation.mutate({ jdText, resumeText });
  };

  const handleStartSession = async () => {
    if (startSessionMutation.isPending || saveJdResumeMutation.isPending || createDraftSessionMutation.isPending) return;

    try {
      // Step 1: Ensure text is saved.
      if (!lastSavedData || jdText !== lastSavedData.jdText || resumeText !== lastSavedData.resumeText) {
        await saveJdResumeMutation.mutateAsync({ jdText, resumeText });
      }

      // Step 2: Create a draft session to get a sessionId.
      const personaId = PERSONA_IDS.HR_RECRUITER_GENERAL;
      const draftSession = await createDraftSessionMutation.mutateAsync({ personaId });

      // Step 3: Use the new sessionId to start the session with pre-generated questions.
      await startSessionMutation.mutateAsync({ 
        sessionId: draftSession.sessionId, 
        personaId: personaId 
      });

    } catch (error) {
      console.error('Error starting interview flow:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      onError?.(`Failed to start interview: ${errorMessage}`);
    }
  };

  const canStartSession = jdText.trim().length > 0 && resumeText.trim().length > 0;
  const isSaving = saveJdResumeMutation.isPending;
  const isStartingSession = startSessionMutation.isPending || createDraftSessionMutation.isPending;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="jd-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Job Description
        </label>
        <textarea
          id="jd-text"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste the job description here..."
          className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical dark:bg-slate-700 dark:text-gray-200 dark:border-gray-600 dark:placeholder-gray-400"
          disabled={isSaving || isStartingSession}
        />
      </div>

      <div>
        <label htmlFor="resume-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Resume
        </label>
        <textarea
          id="resume-text"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume here..."
          className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical dark:bg-slate-700 dark:text-gray-200 dark:border-gray-600 dark:placeholder-gray-400"
          disabled={isSaving || isStartingSession}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving || isStartingSession}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving && <Spinner />}
          {saveStatus === 'saving' ? 'Saving...' : 'Save Text'}
        </button>

        <button
          onClick={handleStartSession}
          disabled={!canStartSession || isSaving || isStartingSession}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isStartingSession && <Spinner />}
          {isStartingSession ? 'Starting Session...' : 'Start Interview'}
        </button>
      </div>

      {saveStatus === 'saved' && (
        <p className="text-sm text-green-600">✓ Text saved successfully</p>
      )}
      {saveStatus === 'error' && (
        <p className="text-sm text-red-600">✗ Error saving text</p>
      )}
    </div>
  );
} 