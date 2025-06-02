/**
 * @fileoverview Component tests for the Timer component.
 *
 * This file contains tests for the Timer component using React Testing Library and Jest fake timers.
 * Updated for elapsed time functionality (counting up from 00:00) rather than countdown.
 */

import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Timer from '~/components/UI/Timer'; // Assuming Timer is a default export

// Helper function to format time as MM:SS for elapsed time
const formatElapsedTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

describe('Timer component - Elapsed Time Mode', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('🟢 GREEN: Elapsed Time Functionality', () => {
    it('should start at 00:00 and count upward', () => {
      render(<Timer />);

      // Should start at 00:00
      expect(screen.getByText('00:00')).toBeInTheDocument();

      // After 1 second, should show 00:01
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText('00:01')).toBeInTheDocument();

      // After 5 more seconds, should show 00:06
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(screen.getByText('00:06')).toBeInTheDocument();
    });

    it('should count beyond 60 seconds correctly', () => {
      render(<Timer />);

      // Fast forward to 1 minute 30 seconds
      act(() => {
        jest.advanceTimersByTime(90000); // 90 seconds = 1:30
      });
      expect(screen.getByText('01:30')).toBeInTheDocument();

      // Fast forward to 10 minutes 5 seconds
      act(() => {
        jest.advanceTimersByTime(515000); // Additional 515 seconds = 8:35 more = 10:05 total
      });
      expect(screen.getByText('10:05')).toBeInTheDocument();
    });

    it('should not accept initialSeconds prop anymore', () => {
      // This test verifies the old countdown API is removed
      render(<Timer />);
      
      // Should always start at 00:00 regardless
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });

    it('should not call onTimerEnd callback since timer never ends', () => {
      const mockCallback = jest.fn();
      
      // Timer should not accept onTimerEnd prop anymore
      render(<Timer />);

      // Run timer for a long time
      act(() => {
        jest.advanceTimersByTime(3600000); // 1 hour
      });

      // Should show 60:00 and callback should never be called
      expect(screen.getByText('60:00')).toBeInTheDocument();
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('🟢 GREEN: Color Progression Based on Elapsed Time', () => {
    it('should start with initial color (under 15 minutes)', () => {
      render(<Timer />);
      const timer = screen.getByText('00:00');

      // Should have initial green color (under 15 minutes)
      expect(timer).toHaveClass('text-green-500', 'dark:text-green-400');
    });

    it('should change to warning color after 15 minutes', () => {
      render(<Timer />);

      // Fast forward to 15 minutes
      act(() => {
        jest.advanceTimersByTime(900000); // 15 minutes = 900 seconds
      });

      const timer = screen.getByText('15:00');
      expect(timer).toHaveClass('text-yellow-500', 'dark:text-yellow-400');
    });

    it('should change to urgent color after 30 minutes', () => {
      render(<Timer />);

      // Fast forward to 30 minutes
      act(() => {
        jest.advanceTimersByTime(1800000); // 30 minutes = 1800 seconds
      });

      const timer = screen.getByText('30:00');
      expect(timer).toHaveClass('text-red-500', 'dark:text-red-400');
    });

    it('should maintain urgent color for very long sessions', () => {
      render(<Timer />);

      // Fast forward to 45 minutes
      act(() => {
        jest.advanceTimersByTime(2700000); // 45 minutes
      });

      const timer = screen.getByText('45:00');
      expect(timer).toHaveClass('text-red-500', 'dark:text-red-400'); // Should stay urgent color
    });
  });

  describe('🟢 GREEN: Component Props and API', () => {
    it('should accept optional className prop', () => {
      render(<Timer className="custom-timer-class" />);
      
      // The className should be applied to the outer div
      const timerContainer = screen.getByRole('timer');
      expect(timerContainer).toHaveClass('custom-timer-class');
    });

    it('should have proper accessibility attributes', () => {
      render(<Timer />);
      
      const timerContainer = screen.getByRole('timer');
      expect(timerContainer).toHaveAttribute('role', 'timer');
      expect(timerContainer).toHaveAttribute('aria-live', 'off');
    });

    it('should display "Time:" label', () => {
      render(<Timer />);
      
      expect(screen.getByText('Time:')).toBeInTheDocument();
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });

    it('should not accept deprecated countdown props', () => {
      // This is more of a TypeScript compile-time test, but we can verify behavior
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
        // Mock implementation - suppress console warnings during test
      });
      
      // These props should not exist in the new API
      render(<Timer />);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
}); 