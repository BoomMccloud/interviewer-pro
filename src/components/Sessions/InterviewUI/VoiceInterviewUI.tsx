'use client';

import React, { useState, useEffect } from 'react';
import styles from './VoiceInterviewUI.module.css'; // We'll create this CSS module next

interface VoiceInterviewUIProps {
  onSendVoiceInput: (audioBlob: Blob) => void; // Callback when user finishes speaking
  personaName?: string;
  // Add any other props needed for voice UI, e.g., AI voice output URL
}

const VoiceInterviewUI: React.FC<VoiceInterviewUIProps> = ({ 
  onSendVoiceInput,
  personaName = "Interviewer"
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Click the button to start speaking.');

  // Mock AI speaking state
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  useEffect(() => {
    // Simulate AI speaking after a short delay if user is not recording
    if (!isRecording) {
      const aiSpeakingTimer = setTimeout(() => {
        setIsAiSpeaking(true);
        setStatusMessage(`${personaName} is speaking...`);
        // Simulate AI finishing speaking
        const aiFinishesSpeakingTimer = setTimeout(() => {
          setIsAiSpeaking(false);
          setStatusMessage('Click the button to start speaking.');
        }, 4000); // AI speaks for 4 seconds
        return () => clearTimeout(aiFinishesSpeakingTimer);
      }, 2000); // AI starts speaking 2 seconds after user finishes or on load
      return () => clearTimeout(aiSpeakingTimer);
    }
  }, [isRecording, personaName]);

  const handleToggleRecording = () => {
    if (isRecording) {
      // Stop recording logic (placeholder)
      setIsRecording(false);
      setStatusMessage('Processing your response...');
      // Simulate sending a blob
      const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
      onSendVoiceInput(mockBlob);
      // Status will update via useEffect when AI "responds"
    } else {
      // Start recording logic (placeholder)
      setIsRecording(true);
      setIsAiSpeaking(false); // Ensure AI stops if it was speaking
      setStatusMessage('Recording... Click again to stop.');
    }
  };

  return (
    <div className={styles.voiceContainer}>
      <div className={styles.personaDisplay}>
        {/* Placeholder for an image or avatar */}
        <div className={styles.avatarPlaceholder}>
          <p>{personaName?.charAt(0).toUpperCase()}</p>
        </div>
        <h3>{personaName}</h3>
        {isAiSpeaking && <p className={styles.aiSpeakingIndicator}><i>Listening... (AI is speaking)</i></p>}
      </div>
      
      <div className={styles.controlsArea}>
        <p className={styles.statusMessage}>{statusMessage}</p>
        <button 
          onClick={handleToggleRecording} 
          className={`button ${isRecording ? styles.recordingButton : ''}`}
          disabled={isAiSpeaking} // Disable if AI is speaking
        >
          {isRecording ? 'Stop Recording' : 'Start Speaking'}
        </button>
      </div>
    </div>
  );
};

export default VoiceInterviewUI; 