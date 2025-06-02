/**
 * Timer Component - Shows elapsed time during an interview session
 * Key functions: Counts up from 00:00, displays time in MM:SS format, changes color based on duration
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

interface TimerProps {
  className?: string;
}

const Timer: React.FC<TimerProps> = ({ className }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start the timer immediately
    timerIdRef.current = setInterval(() => {
      setElapsedSeconds((prevSeconds) => prevSeconds + 1);
    }, 1000);

    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine color based on elapsed time
  const getTimerColor = () => {
    if (elapsedSeconds >= 1800) return 'text-red-500 dark:text-red-400'; // Over 30 minutes - red
    if (elapsedSeconds >= 900) return 'text-yellow-500 dark:text-yellow-400'; // Over 15 minutes - yellow
    return 'text-green-500 dark:text-green-400'; // Under 15 minutes - green
  };

  return (
    <div 
      className={`inline-flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm ${className ?? ''}`.trim()} 
      role="timer" 
      aria-live="off"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Time:
        </span>
        <span className={`text-lg font-bold tabular-nums ${getTimerColor()}`}>
          {formatTime(elapsedSeconds)}
        </span>
      </div>
    </div>
  );
};

export default Timer;

// Add some basic styling for Timer to globals.css if not already present
// For example:
// .timer-display {
//   font-size: 1.2rem;
//   font-weight: bold;
//   color: var(--primary-color);
//   padding: 0.5rem 1rem;
//   background-color: var(--secondary-color);
//   border-radius: 6px;
//   display: inline-block;
//   margin-bottom: 1rem;
// } 