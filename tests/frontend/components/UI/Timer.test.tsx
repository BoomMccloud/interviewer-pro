/**
 * @fileoverview Component tests for the Timer component.
 *
 * This file contains tests for the Timer component using React Testing Library and Jest fake timers.
 * It ensures that the Timer renders the time format correctly and implements basic countdown logic.
 */

import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Timer from '~/components/UI/Timer'; // Assuming Timer is a default export

// Helper function to format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.max(0, Math.floor(seconds / 60)).toString().padStart(2, '0');
  const secs = Math.max(0, seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const getExpectedText = (seconds: number): RegExp => {
  return new RegExp(`Time Remaining: ${formatTime(seconds)}`);
};

describe('Timer component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders initial time correctly', () => {
    const initialSeconds = 125; // 02:05
    render(<Timer initialSeconds={initialSeconds} />);
    expect(screen.getByText(getExpectedText(initialSeconds))).toBeInTheDocument();
  });

  test('counts down correctly over time', () => {
    const initialSeconds = 5;
    render(<Timer initialSeconds={initialSeconds} />);

    expect(screen.getByText(getExpectedText(initialSeconds))).toBeInTheDocument(); // Time Remaining: 00:05

    act(() => {
      jest.advanceTimersByTime(1000); // Advance by 1 second
    });
    expect(screen.getByText(getExpectedText(initialSeconds - 1))).toBeInTheDocument(); // Time Remaining: 00:04

    act(() => {
      jest.advanceTimersByTime(2000); // Advance by 2 more seconds
    });
    expect(screen.getByText(getExpectedText(initialSeconds - 3))).toBeInTheDocument(); // Time Remaining: 00:02
  });

  test('calls onTimerEnd when timer reaches zero', () => {
    const initialSeconds = 2;
    const handleTimerEnd = jest.fn();
    render(<Timer initialSeconds={initialSeconds} onTimerEnd={handleTimerEnd} />);

    expect(screen.getByText(getExpectedText(initialSeconds))).toBeInTheDocument();
    expect(handleTimerEnd).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000); // 00:01
    });
    expect(screen.getByText(getExpectedText(initialSeconds - 1))).toBeInTheDocument();
    expect(handleTimerEnd).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000); // 00:00 - timer ends
    });
    expect(screen.getByText(getExpectedText(0))).toBeInTheDocument();
    expect(handleTimerEnd).toHaveBeenCalledTimes(1);
  });

  test('does not count down below zero', () => {
    const initialSeconds = 1;
    const handleTimerEnd = jest.fn();
    render(<Timer initialSeconds={initialSeconds} onTimerEnd={handleTimerEnd} />);

    act(() => {
      jest.advanceTimersByTime(2000); // Advance past zero
    });
    expect(screen.getByText(getExpectedText(0))).toBeInTheDocument();
    expect(handleTimerEnd).toHaveBeenCalledTimes(1);

    // Advance timers again, should still be 00:00 and callback not called again
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(getExpectedText(0))).toBeInTheDocument();
    expect(handleTimerEnd).toHaveBeenCalledTimes(1);
  });

  // Future tests could include:
  // - Pausing and resuming the timer if such functionality is added.
  // - Resetting the timer.
  // - Displaying different states or messages when timer ends (e.g., "Time's up!").
}); 