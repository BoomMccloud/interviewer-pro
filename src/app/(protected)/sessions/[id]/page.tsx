'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '~/trpc/react';
import TextInterviewUI from '~/components/Sessions/InterviewUI/TextInterviewUI';
import VoiceInterviewUI from '~/components/Sessions/InterviewUI/VoiceInterviewUI';
import LiveVoiceInterviewUI from '~/components/Sessions/InterviewUI/LiveVoiceInterviewUI';
import MicrophoneTest from '~/components/Sessions/InterviewUI/MicrophoneTest';
import { INTERVIEW_MODES, SESSION_STATES, PERSONA_IDS } from '~/types';
import type { InterviewMode, SessionState, GeneratedQuestion, PersonaId } from '~/types';
import { getPersona } from '~/lib/personaService';
import ImprovedAudioWorkletExample from '~/components/Sessions/InterviewUI/ImprovedAudioWorkletExample';

export default function SessionPage() {
  // For now, show the ImprovedAudioWorkletExample for testing
  return <ImprovedAudioWorkletExample />;
} 