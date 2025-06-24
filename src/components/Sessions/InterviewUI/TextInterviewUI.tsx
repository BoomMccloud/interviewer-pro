/**
 * TextInterviewUI Component
 * 
 * This component provides the text-based interview interface with:
 * - Current question displayed prominently at the top
 * - Chat interface at the bottom for user responses
 * - Flex layout design for future modality expansion
 * - Integration with live interview backend procedures
 * - UPDATED: Now uses QuestionSegments structure with 'ai' role and 'content' field
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Timer from '~/components/UI/Timer';

// UPDATED: New message structure for QuestionSegments migration
interface ConversationMessage {
  role: 'user' | 'ai';  // Changed from 'model' to 'ai'
  content: string;      // Changed from 'text' to 'content'
  timestamp: Date;
}

interface TextInterviewUIProps {
  sessionData: {
    sessionId: string;
    history: ConversationMessage[];
    currentQuestion: string;
    keyPoints: string[];
    status: 'active' | 'paused' | 'completed';
    startTime: Date | null;
    personaName?: string; // Name of the interviewer persona
    questionNumber?: number;
    totalQuestions?: number;
  };
  userInput: string;
  setUserInput: (input: string) => void;
  onSubmitResponse: (response: string) => Promise<void>;
  isLoading: boolean;
  onMoveToNext?: () => Promise<void>;
  onSave?: () => Promise<void>;
  onEnd?: () => Promise<void>;
  isSaving?: boolean;
  isEnding?: boolean;
  isMovingToNext?: boolean;
}

export default function TextInterviewUI({ 
  sessionData, 
  userInput, 
  setUserInput, 
  onSubmitResponse, 
  isLoading,
  onMoveToNext,
  onSave,
  onEnd,
  isSaving,
  isEnding,
  isMovingToNext,
}: TextInterviewUIProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize conversation history from sessionData
  const [conversation, setConversation] = useState<ConversationMessage[]>(sessionData.history || []);

  // Update conversation when sessionData changes
  useEffect(() => {
    if (sessionData.history) {
      setConversation(sessionData.history);
    }
  }, [sessionData.history]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [conversation]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [userInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const messageText = userInput.trim();
    
    // Add user message to local history immediately for responsive UI
    const userMessage: ConversationMessage = {
      role: 'user',
      content: messageText,  // Updated to use 'content' instead of 'text'
      timestamp: new Date(),
    };
    
    setConversation(prev => [...prev, userMessage]);
    setUserInput('');

    try {
      await onSubmitResponse(messageText);
      
      // The onSubmitResponse handler will trigger a session refetch which will
      // update the conversation history with the AI response automatically
      
    } catch (error) {
      // Handle error - could show error message in UI
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div
      data-testid="text-interview-ui"
      className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600"
    >
      {/* Current Question Section - Top */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-b border-gray-200 dark:border-gray-600 p-6">
        <div className="w-full flex gap-6">
          {/* Questions and Guidance Container */}
          <div className="flex-1">
            {sessionData.questionNumber && sessionData.totalQuestions && (
              <div
                className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 tracking-wide"
                data-testid="question-progress"
              >
                Question {sessionData.questionNumber} of {sessionData.totalQuestions}
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Current Question:
              </span>
              {sessionData.personaName && (
                <span className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                  👤 {sessionData.personaName}
                </span>
              )}
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-relaxed mb-4 p-4 bg-gray-50/30 dark:bg-slate-800/30 rounded-lg">
              {sessionData.currentQuestion || 'Loading next question...'}
            </h2>
            
            {/* AI Guidance Hints */}
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-blue-100 dark:border-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">💡</span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <strong className="text-blue-900 dark:text-blue-400">Key points:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {sessionData.keyPoints && sessionData.keyPoints.length > 0 ? (
                      sessionData.keyPoints.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))
                    ) : (
                      <>
                        <li>Focus on your specific role and contributions</li>
                        <li>Highlight technologies and tools you used</li>
                        <li>Discuss challenges faced and how you overcame them</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Timer Container */}
          <div className="flex-shrink-0 flex items-center">
            {sessionData.startTime && <Timer />}
          </div>
        </div>
      </div>

      {/* Chat History Section - Middle (Scrollable) */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 dark:bg-slate-800/30"
        style={{ minHeight: '200px' }}
      >
        {conversation.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-lg mb-2">🎯</div>
              <p>Your conversation history will appear here</p>
              <p className="text-sm mt-1">Answer the question above to get started</p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {conversation.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Processing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 max-w-[75%]">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="text-sm">AI is preparing next question...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Section - Bottom */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-600 p-6">
        <div className="w-full">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3 items-stretch">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void handleSubmit(e);
                    }
                  }}
                  placeholder="Type your response here... (Press Ctrl+Enter to send)"
                  className="w-full min-h-[60px] max-h-[120px] p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
                  disabled={isLoading}
                  rows={2}
                />
              </div>
              <div className="flex">
                <button
                  type="submit"
                  className="h-full px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={isLoading || !userInput.trim()}
                >
                  {isLoading ? 'Thinking...' : 'Submit Response'}
                </button>
              </div>
            </div>
            
            {/* Session Controls */}
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tip: Press{' '}
                <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                  Ctrl+Enter
                </kbd>{' '}
                to send your message.
              </p>
              <div className="flex items-center gap-2">
                {onMoveToNext && sessionData.questionNumber && (
                   <button
                    type="button"
                    onClick={onMoveToNext}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400"
                    disabled={isLoading || isMovingToNext}
                  >
                    {isMovingToNext ? 'Loading...' : 'Next Question'}
                  </button>
                )}

                {onSave && (
                  <button 
                    type="button" 
                    onClick={onSave}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                )}

                {onEnd && (
                  <button 
                    type="button" 
                    onClick={onEnd}
                    disabled={isEnding}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none disabled:opacity-50"
                  >
                    {isEnding ? 'Ending...' : 'End Interview'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 