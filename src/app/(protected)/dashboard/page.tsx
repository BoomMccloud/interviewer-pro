/**
 * @fileoverview The main dashboard page for authenticated users.
 * Displays the JD/Resume input form and the user's session history.
 * Handles initial data loading and orchestrates interactions with child components and APIs.
 */

'use client'; // This is a client component

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter for client-side navigation

// Assuming these components will be created later
// import MvpJdResumeInputForm from '~/components/MvpJdResumeInputForm';
// import MvpSessionHistoryList from '~/components/MvpSessionHistoryList';
// Assuming a shared Spinner component exists
import Spinner from '~/components/UI/Spinner'; // Update path if needed

// Assuming API utility functions are available here
// import { utils } from '~/utils/api';

// Placeholder components for now to allow the page structure to be built
const MvpJdResumeInputForm = () => <div>JD/Resume Input Form Placeholder</div>;
const MvpSessionHistoryList = () => <div>Session History List Placeholder</div>;


export default function DashboardPage() {
  const router = useRouter(); // Initialize useRouter

  // State to manage loading of initial data
  const [isLoading, setIsLoading] = useState(true);
  // State to hold fetched data (placeholders for now)
  const [jdResumeText, setJdResumeText] = useState({ jdText: '', resumeText: '' });
  const [sessionHistory, setSessionHistory] = useState([]);

  useEffect(() => {
    // Simulate fetching data
    const fetchData = async () => {
      setIsLoading(true); // Set loading state to true

      // In a real implementation, you would call your API utilities here:
      // try {
      //   const [jdResumeData, sessionsData] = await Promise.all([
      //     utils.getMvpJdResumeText(),
      //     utils.listMvpSessionsForCurrentText(),
      //   ]);
      //   setJdResumeText(jdResumeData);
      //   setSessionHistory(sessionsData);
      // } catch (error) {
      //   console.error('Failed to fetch dashboard data:', error);
      //   // Handle error state if needed
      // } finally {
      //   setIsLoading(false); // Set loading state to false after fetch completes
      // }

      // --- Placeholder simulation ---
      // Simulate a network delay before setting loading to false
       await new Promise(resolve => setTimeout(resolve, 300)); // Simulate minimum loading time
      setIsLoading(false); // Set loading state to false after simulated fetch
      // --- End Placeholder simulation ---
    };

    fetchData();
  }, []); // Empty dependency array means this runs once on mount

  // Handlers for form interactions (placeholders for now)
  const handleSaveText = async (data: { jdText: string; resumeText: string }) => {
    console.log('Saving text (placeholder):', data);
    // try {
    //   await utils.saveMvpJdResumeText(data);
    //   // Handle success
    // } catch (error) {
    //   console.error('Failed to save text:', error);
    //   // Handle error
    // }
  };

  const handleStartSession = async () => {
    console.log('Starting session (placeholder)');
    // try {
    //   const newSession = await utils.createMvpSession();
    //   router.push(`/sessions/${newSession.sessionId}`);
    // } catch (error) {
    //   console.error('Failed to create session:', error);
    //   // Handle error
    // }
  };

  // Handler for clicking on a history item (placeholder for now)
  const handleHistoryItemClick = (sessionId: string) => {
     console.log('Navigating to session report (placeholder):', sessionId);
     router.push(`/sessions/${sessionId}/report`);
  };


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {/* Conditional rendering based on loading state */}
      {isLoading ? (
        // Assuming Spinner component has a data-testid="spinner"
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-3">Job Description & Resume</h2>
              <MvpJdResumeInputForm
                // Pass initial data and save handler (placeholders)
                initialJdText={jdResumeText.jdText}
                initialResumeText={jdResumeText.resumeText}
                onSave={handleSaveText}
                onStartSession={handleStartSession}
              />
            </div>
            <div>
               <h2 className="text-xl font-semibold mb-3">Session History</h2>
               <MvpSessionHistoryList
                 // Pass session history data and click handler (placeholders)
                 sessions={sessionHistory}
                 onSessionClick={handleHistoryItemClick}
               />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Minimal Spinner component placeholder if not already in UI library
// You would typically import this from your UI library
// const Spinner = ({ 'data-testid': dataTestId }: { 'data-testid'?: string }) => (
//   <div data-testid={dataTestId}>Loading...</div>
// ); 