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
    if (elapsedSeconds >= 1800) return 'text-red-400 dark:text-red-600'; // Over 30 minutes - red
    if (elapsedSeconds >= 900) return 'text-yellow-400 dark:text-yellow-600'; // Over 15 minutes - yellow
    return 'text-green-400 dark:text-green-600'; // Under 15 minutes - green
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center w-20 h-20 bg-slate-900 dark:bg-white border-2 border-slate-700 dark:border-slate-300 rounded-lg shadow-lg ${className ?? ''}`.trim()} 
      role="timer" 
      aria-live="off"
    >
      <span className="text-xs font-medium text-slate-400 dark:text-slate-600 mb-1">
        Time
      </span>
      <span className={`text-lg font-bold tabular-nums ${getTimerColor()}`}>
        {formatTime(elapsedSeconds)}
      </span>
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