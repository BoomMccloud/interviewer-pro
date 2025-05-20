'use client';

import React from 'react';

interface TimerProps {
  remainingTime: number; // Time in seconds
  className?: string;
}

const Timer: React.FC<TimerProps> = ({ remainingTime, className }) => {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`timer-display ${className ?? ''}`}>
      <p>Time Remaining: {formatTime(remainingTime)}</p>
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