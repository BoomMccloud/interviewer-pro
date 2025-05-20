'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation'; // To get [id] from URL

import Timer from '~/components/UI/Timer'; // Adjusted path
import TextInterviewUI from '~/components/Sessions/InterviewUI/TextInterviewUI'; // Adjusted path
import VoiceInterviewUI from '~/components/Sessions/InterviewUI/VoiceInterviewUI'; // Import Voice UI
// import { api } from "~/trpc/react"; // For future tRPC integration

// Define modality type
type InterviewModality = 'text' | 'voice' | 'avatar';

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string; // Or handle array/undefined if necessary

  // State for current modality - FOR DEMO ONLY. This would come from sessionData in reality.
  const [currentModality, setCurrentModality] = useState<InterviewModality>('text');

  // Placeholder data - replace with tRPC data fetching later
  const mockSessionData = {
    id: sessionId,
    personaName: "Technical Lead",
    initialMessages: [
      {
        id: 'ai-start',
        text: "Welcome! Let's start with your experience in...",
        sender: 'ai' as const,
        timestamp: new Date(),
      },
    ],
    remainingTime: 15 * 60, 
  };

  const handleSendMessage = (messageText: string) => {
    console.log(`Message sent (text) to session ${sessionId}:`, messageText);
    // tRPC call for text
  };

  const handleVoiceInput = (audioBlob: Blob) => {
    console.log(`Voice input received for session ${sessionId}:`, audioBlob);
    // tRPC call for voice
  };

  // Placeholder: Fetch actual session details using sessionId via tRPC
  // const { data: sessionData, isLoading } = api.session.getSessionById.useQuery({ id: sessionId });
  // if (isLoading) return <p className="container">Loading session...</p>;
  // if (!sessionData) return <p className="container">Session not found.</p>;
  // const actualModality = sessionData.modality; // This would be the source of truth

  const renderInterviewUI = () => {
    // In a real scenario, you'd use actualModality from sessionData
    switch (currentModality) { 
      case 'voice':
        return <VoiceInterviewUI onSendVoiceInput={handleVoiceInput} personaName={mockSessionData.personaName} />;
      case 'avatar':
        // Replace with AvatarInterviewUI when created
        return <div className="card"><p>Avatar UI Placeholder (Modality: {currentModality})</p></div>; 
      case 'text':
      default:
        return (
          <TextInterviewUI
            initialMessages={mockSessionData.initialMessages || []}
            onSendMessage={handleSendMessage}
            personaName={mockSessionData.personaName}
          />
        );
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1>Interview Session: {sessionId}</h1>
        <Timer remainingTime={mockSessionData.remainingTime} />
      </div>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <p style={{margin: 'auto 0'}}>Demo - Switch Modality:</p>
        <button className="button" onClick={() => setCurrentModality('text')}>Text</button>
        <button className="button" onClick={() => setCurrentModality('voice')}>Voice</button>
        <button className="button" onClick={() => setCurrentModality('avatar')}>Avatar (Placeholder)</button>
      </div>
      
      {renderInterviewUI()}
      
      {/* Add button to end session and go to report page - for later */}
      {/* <button className="button" style={{marginTop: '1rem'}}>
        End Session & View Report
      </button> */}
    </div>
  );
} 