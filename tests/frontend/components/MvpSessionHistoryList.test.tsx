/**
 * @fileoverview Tests for the MvpSessionHistoryList component.
 * Tests session list display, loading states, empty states, and click interactions.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MvpSessionHistoryList from '~/components/MvpSessionHistoryList';
import type { SessionData, MvpSessionTurn } from '~/types';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
});

describe('MvpSessionHistoryList', () => {
  const mockSessionTurn: MvpSessionTurn = {
    id: 'turn-1',
    role: 'model',
    text: 'What is your experience with React?',
    timestamp: new Date('2023-01-01T10:00:00Z'),
  };

  const mockCompletedSession: Omit<SessionData, 'history'> & { history: MvpSessionTurn[] } = {
    id: 'session-1',
    userId: 'user-1',
    personaId: 'swe-interviewer-standard',
    jdResumeTextId: 'jd-resume-1',
    startTime: new Date('2023-01-01T10:00:00Z'),
    endTime: new Date('2023-01-01T10:15:00Z'),
    durationInSeconds: 900,
    history: [mockSessionTurn, { ...mockSessionTurn, id: 'turn-2', role: 'user', text: 'I have 3 years experience...' }],
    overallSummary: 'Good performance on React questions.',
    createdAt: new Date('2023-01-01T10:00:00Z'),
    updatedAt: new Date('2023-01-01T10:15:00Z'),
  };

  const mockInProgressSession: Omit<SessionData, 'history'> & { history: MvpSessionTurn[] } = {
    ...mockCompletedSession,
    id: 'session-2',
    endTime: null,
    overallSummary: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = '';
  });

  it('renders empty state when no sessions', () => {
    render(<MvpSessionHistoryList sessions={[]} />);

    expect(screen.getByText('No interview sessions yet')).toBeInTheDocument();
    expect(screen.getByText('Start your first interview to see sessions here')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<MvpSessionHistoryList sessions={[]} isLoading={true} />);

    // Should show 3 skeleton loaders
    const skeletonLoaders = screen.getAllByRole('generic').filter(el => 
      el.classList.contains('animate-pulse')
    );
    expect(skeletonLoaders).toHaveLength(3);
  });

  it('renders completed session correctly', () => {
    render(<MvpSessionHistoryList sessions={[mockCompletedSession]} />);

    expect(screen.getByText('Interview Session')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('1 questions')).toBeInTheDocument();
    expect(screen.getByText('Duration: 15m')).toBeInTheDocument();
    expect(screen.getByText('Good performance on React questions.')).toBeInTheDocument();
  });

  it('renders in-progress session correctly', () => {
    render(<MvpSessionHistoryList sessions={[mockInProgressSession]} />);

    expect(screen.getByText('Interview Session')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('1 questions')).toBeInTheDocument();
    // Should not show duration for in-progress sessions
    expect(screen.queryByText(/Duration:/)).not.toBeInTheDocument();
    // Should not show summary for in-progress sessions
    expect(screen.queryByText('Good performance on React questions.')).not.toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    const sessionWithSpecificDate = {
      ...mockCompletedSession,
      startTime: new Date('2023-06-15T14:30:00Z'),
    };

    render(<MvpSessionHistoryList sessions={[sessionWithSpecificDate]} />);

    // Should format as "Jun 15, 2:30 PM" or similar depending on locale
    expect(screen.getByText(/Jun 15/)).toBeInTheDocument();
  });

  it('calculates question count correctly', () => {
    const sessionWithMultipleQuestions = {
      ...mockCompletedSession,
      history: [
        { ...mockSessionTurn, id: 'turn-1', role: 'model' as const },
        { ...mockSessionTurn, id: 'turn-2', role: 'user' as const },
        { ...mockSessionTurn, id: 'turn-3', role: 'model' as const },
        { ...mockSessionTurn, id: 'turn-4', role: 'user' as const },
        { ...mockSessionTurn, id: 'turn-5', role: 'model' as const },
      ],
    };

    render(<MvpSessionHistoryList sessions={[sessionWithMultipleQuestions]} />);

    expect(screen.getByText('3 questions')).toBeInTheDocument();
  });

  it('formats duration correctly for different time ranges', () => {
    const shortSession = {
      ...mockCompletedSession,
      startTime: new Date('2023-01-01T10:00:00Z'),
      endTime: new Date('2023-01-01T10:00:45Z'), // 45 seconds
    };

    const longSession = {
      ...mockCompletedSession,
      id: 'session-long',
      startTime: new Date('2023-01-01T10:00:00Z'),
      endTime: new Date('2023-01-01T11:35:30Z'), // 1 hour 35 minutes 30 seconds
    };

    render(<MvpSessionHistoryList sessions={[shortSession, longSession]} />);

    expect(screen.getByText('Duration: 45s')).toBeInTheDocument();
    expect(screen.getByText('Duration: 95m 30s')).toBeInTheDocument();
  });

  it('calls onSessionClick when session is clicked', async () => {
    const user = userEvent.setup();
    const mockOnSessionClick = jest.fn();

    render(
      <MvpSessionHistoryList
        sessions={[mockCompletedSession]}
        onSessionClick={mockOnSessionClick}
      />
    );

    const sessionItem = screen.getByTestId('session-item');
    await user.click(sessionItem);

    expect(mockOnSessionClick).toHaveBeenCalledWith('session-1');
  });

  it('navigates to session report by default when clicked', async () => {
    const user = userEvent.setup();

    render(<MvpSessionHistoryList sessions={[mockCompletedSession]} />);

    const sessionItem = screen.getByTestId('session-item');
    await user.click(sessionItem);

    expect(window.location.href).toBe('/sessions/session-1/report');
  });

  it('renders multiple sessions in correct order', () => {
    const sessions = [mockCompletedSession, mockInProgressSession];

    render(<MvpSessionHistoryList sessions={sessions} />);

    const sessionItems = screen.getAllByTestId('session-item');
    expect(sessionItems).toHaveLength(2);

    // Check that both sessions are rendered
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('applies correct CSS classes for status badges', () => {
    render(<MvpSessionHistoryList sessions={[mockCompletedSession, mockInProgressSession]} />);

    const completedBadge = screen.getByText('Completed');
    const inProgressBadge = screen.getByText('In Progress');

    expect(completedBadge).toHaveClass('bg-green-100', 'text-green-800');
    expect(inProgressBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('truncates long summaries appropriately', () => {
    const sessionWithLongSummary = {
      ...mockCompletedSession,
      overallSummary: 'This is a very long summary that should be truncated. '.repeat(10),
    };

    render(<MvpSessionHistoryList sessions={[sessionWithLongSummary]} />);

    const summaryElement = screen.getByText(/This is a very long summary/);
    expect(summaryElement).toHaveClass('line-clamp-2');
  });

  it('shows hover effects with correct CSS classes', () => {
    render(<MvpSessionHistoryList sessions={[mockCompletedSession]} />);

    const sessionItem = screen.getByTestId('session-item');
    expect(sessionItem).toHaveClass('hover:border-blue-300', 'hover:shadow-sm', 'cursor-pointer');
  });
}); 