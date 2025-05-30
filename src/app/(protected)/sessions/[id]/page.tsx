'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ControlBar } from '~/components/Sessions/DesignUI/control-bar';

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  // Mock handlers for the control bar
  const handlePrevious = () => {
    console.log('Previous question');
  };

  const handleNext = () => {
    console.log('Next question');
  };

  const handleEnd = () => {
    console.log('End interview');
  };

  return (
    <div className="h-screen bg-white dark:bg-slate-900 flex flex-col">
      {/* Main content area - flexible */}
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Session {sessionId}
        </h1>
        
        {/* Theme toggle is in the top-right corner via layout.tsx */}
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Ready for development...
        </p>
      </div>

      {/* Control Bar - fixed height */}
      <ControlBar
        onPrevious={handlePrevious}
        onNext={handleNext}
        onEnd={handleEnd}
        isFirstQuestion={false}
        isLastQuestion={false}
      />
    </div>
  );
} 