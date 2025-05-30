/**
 * TextInterviewUI Component
 * 
 * This component provides the text-based interview interface with:
 * - Current question displayed prominently at the top
 * - Chat interface at the bottom for user responses
 * - Flex layout design for future modality expansion
 * - Integration with live interview backend procedures
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ConversationMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: string;
  isNew?: boolean;
}

interface TextInterviewUIProps {
  sessionData: {
    sessionId: string;
    isActive: boolean;
    personaId: string;
    currentQuestion: string;
    conversationHistory: ConversationMessage[];
    questionNumber: number;
    timeRemaining: number;
  };
  currentQuestion: string;
  isProcessingResponse: boolean;
  onSendMessage: (message: string) => Promise<void>;
  onPause: () => Promise<void>;
  onEnd: () => Promise<void>;
}

export default function TextInterviewUI({
  sessionData,
  currentQuestion,
  isProcessingResponse,
  onSendMessage,
  onPause,
  onEnd,
}: TextInterviewUIProps) {
  const [userInput, setUserInput] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize conversation history from sessionData
  useEffect(() => {
    if (sessionData?.conversationHistory) {
      setConversationHistory(sessionData.conversationHistory.map(msg => ({
        ...msg,
        isNew: false,
      })));
    }
  }, [sessionData]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [userInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isProcessingResponse) return;

    const messageText = userInput.trim();
    
    // Add user message to local history immediately for responsive UI
    const userMessage: ConversationMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
      isNew: true,
    };
    
    setConversationHistory(prev => [...prev, userMessage]);
    setUserInput('');

    try {
      await onSendMessage(messageText);
      
      // Add AI response to local history (currentQuestion is updated by parent)
      setTimeout(() => {
        const aiMessage: ConversationMessage = {
          role: 'ai',
          content: currentQuestion,
          timestamp: new Date().toISOString(),
          isNew: true,
        };
        setConversationHistory(prev => [...prev, aiMessage]);
      }, 500); // Small delay to show processing state
      
    } catch (error) {
      // Handle error - could show error message in UI
      console.error('Failed to send message:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Current Question Section - Top */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-600">
                  Question {sessionData.questionNumber} • {sessionData.personaId}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
                {currentQuestion || 'Loading next question...'}
              </h2>
            </div>
            <div className="flex-shrink-0 ml-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Time Remaining</div>
                <div className="text-lg font-mono font-semibold text-gray-900">
                  {formatTime(sessionData.timeRemaining)}
                </div>
              </div>
            </div>
          </div>
          
          {/* AI Guidance Hints */}
          <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs font-semibold">💡</span>
              </div>
              <div className="text-sm text-gray-700">
                <strong className="text-blue-900">Guidance:</strong> Take a moment to structure your response. 
                Consider specific examples from your experience that demonstrate your skills and impact.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat History Section - Middle (Scrollable) */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30"
        style={{ minHeight: '200px' }}
      >
        {conversationHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">🎯</div>
              <p>Your conversation history will appear here</p>
              <p className="text-sm mt-1">Answer the question above to get started</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {conversationHistory.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  } ${message.isNew ? 'animate-fade-in' : ''}`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Processing indicator */}
            {isProcessingResponse && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 max-w-[75%]">
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
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
      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your response here... (Press Ctrl+Enter to send)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 placeholder-gray-500"
                style={{ minHeight: '52px', maxHeight: '120px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void handleSubmit(e);
                  }
                }}
                disabled={isProcessingResponse}
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={!userInput.trim() || isProcessingResponse}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isProcessingResponse ? 'Sending...' : 'Send'}
              </button>
              <button
                type="button"
                onClick={onPause}
                className="px-6 py-1 text-gray-600 hover:text-gray-800 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Pause
              </button>
            </div>
          </form>
          
          {/* Session Controls */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to send quickly
            </div>
            <button
              onClick={onEnd}
              className="px-4 py-2 text-red-600 hover:text-red-700 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors"
            >
              End Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 