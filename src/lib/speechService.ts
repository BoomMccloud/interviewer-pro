/**
 * speechService.ts
 * ----------------
 * Thin abstraction over the Speech-to-Text provider used by the backend.
 * Phase-2 MVP simply returns a placeholder transcript so that higher layers
 * can be implemented and tested in isolation.  Real implementation will call
 * Google Speech-to-Text, Whisper, etc.
 */

import { transcribeAudioOnce } from './gemini';

/* eslint-disable @typescript-eslint/no-unsafe-argument */
export async function transcribe(audio: Blob | Buffer): Promise<string> {
  return await transcribeAudioOnce(audio);
} 