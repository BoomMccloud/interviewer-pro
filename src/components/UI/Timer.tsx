'use client';

import React, { useState, useEffect, useRef } from 'react';

interface TimerProps {
  initialSeconds: number; // Initial time in seconds
  onTimerEnd?: () => void; // Optional callback when timer ends
  className?: string;
}

const Timer: React.FC<TimerProps> = ({ initialSeconds, onTimerEnd, className }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const onTimerEndRef = useRef(onTimerEnd); // Ref to store the latest onTimerEnd callback

  // Update ref if onTimerEnd prop changes
  useEffect(() => {
    onTimerEndRef.current = onTimerEnd;
  }, [onTimerEnd]);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      if (onTimerEndRef.current) {
        onTimerEndRef.current();
      }
      return;
    }

    timerIdRef.current = setInterval(() => {
      setRemainingSeconds((prevSeconds) => Math.max(0, prevSeconds - 1));
    }, 1000);

    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    };
  }, [remainingSeconds]);

  // Reset timer if initialSeconds changes
  useEffect(() => {
    setRemainingSeconds(initialSeconds);
    // Clear existing interval if initialSeconds changes mid-timer
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
    }
    // Restart interval if initialSeconds > 0
    if (initialSeconds > 0) {
        timerIdRef.current = setInterval(() => {
            setRemainingSeconds((prevSeconds) => Math.max(0, prevSeconds - 1));
        }, 1000);
    }
  }, [initialSeconds]);


  const formatTime = (seconds: number): string => {
    const minutes = Math.max(0, Math.floor(seconds / 60));
    const secs = Math.max(0, seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`timer-display ${className ?? ''}`.trim()} role="timer" aria-live="off">
      {/* Using a more descriptive text or specific elements for minutes and seconds might be better for screen readers 
          For MVP, keeping it simple. The aria-live="off" is because the content updates frequently.
          A better approach for accessibility might involve a more static label and aria-atomic updates.
      */}
      <p>Time Remaining: {formatTime(remainingSeconds)}</p>
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