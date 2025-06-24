/**
 * geminiLiveInterview.ts
 * ----------------------
 * Simplified Gemini Live API service for continuous voice interviews.
 * Handles real-time audio streaming with automatic question initiation.
 * 
 * Key Features:
 * - 3-state management: disconnected | connected | error
 * - System prompt with interview question initialization
 * - Continuous live session (no stop/start recording)
 * - Auto-starts with AI asking the first question
 * - Real-time audio processing via Gemini Live API
 */

import { GoogleGenAI, type LiveServerMessage, Modality, type Session, type Blob as GeminiBlob } from '@google/genai';

export type LiveSessionState = 'disconnected' | 'connected' | 'error';

export interface LiveInterviewConfig {
  question: string;
  personaId: string;
  sessionId: string;
  onStateChange: (state: LiveSessionState) => void;
  onError: (error: string) => void;
  onAudioReceived: (audioData: string) => void;
  onTranscriptReceived?: (transcript: string) => void;
}

export class GeminiLiveInterviewService {
  private client: GoogleGenAI | null = null;
  private session: Session | null = null;
  private state: LiveSessionState = 'disconnected';
  private config: LiveInterviewConfig;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();

  constructor(config: LiveInterviewConfig) {
    this.config = config;
    try {
      this.initializeAudioContexts();
      this.initializeClient();
    } catch (error) {
      console.error('Failed to initialize GeminiLiveInterviewService:', error);
      this.updateState('error');
      this.config.onError(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private initializeAudioContexts() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioContext = new AudioContextClass({
      sampleRate: 16000
    });
    this.outputAudioContext = new AudioContextClass({
      sampleRate: 24000
    });
    
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  private initializeClient() {
    // Note: For Live API, we need the API key on the client side
    // In production, consider using a server-side proxy for better security
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      this.updateState('error');
      this.config.onError('Gemini API key not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY in your environment.');
      return;
    }

    this.client = new GoogleGenAI({ apiKey });
  }

  private updateState(newState: LiveSessionState) {
    this.state = newState;
    this.config.onStateChange(newState);
  }

  private createSystemPrompt(): string {
    return `You are a technical interviewer conducting a voice interview. 

IMMEDIATELY upon connection, start the interview by saying:
"Hello! I'm your interviewer for today's technical session. Let's begin with this question: ${this.config.question}"

Then:
- Listen to the candidate's complete response
- Ask relevant follow-up questions to dive deeper
- Keep the conversation natural and professional
- When you feel you have enough information, provide a brief assessment
- The entire conversation should flow naturally like a real interview

Remember: Start immediately with the greeting and question above. Do not wait for the candidate to speak first.`;
  }

  async startSession(): Promise<void> {
    try {
      console.log('🚀 [LiveInterview] Starting session...');
      
      if (!this.client) {
        console.error('❌ [LiveInterview] Client not initialized');
        this.updateState('error');
        this.config.onError('Gemini client not initialized. Please check your API key configuration.');
        return;
      }

      console.log('✅ [LiveInterview] Client is ready');
      console.log('📋 [LiveInterview] System prompt:', this.createSystemPrompt());

      const sessionConfig = {
        model: 'gemini-2.5-flash-preview-native-audio-dialog',
        callbacks: {
          onopen: () => {
            console.log('✅ [LiveInterview] Live session opened - AI will start speaking automatically');
            this.updateState('connected');
          },
          onmessage: (message: LiveServerMessage) => {
            console.log('📨 [LiveInterview] Received message:', JSON.stringify(message, null, 2));
            void this.handleMessage(message);
          },
          onerror: (error: ErrorEvent) => {
            console.error('❌ [LiveInterview] Live session error:', error);
            this.updateState('error');
            this.config.onError(`Session error: ${error.message}`);
          },
          onclose: (event: CloseEvent) => {
            console.log('🔒 [LiveInterview] Session closed:', event.reason, 'Code:', event.code);
            this.updateState('disconnected');
            if (event.code !== 1000) { // Not a normal closure
              this.config.onError(`Session closed unexpectedly: ${event.reason}`);
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: this.createSystemPrompt(),
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Orus'
              }
            }
          }
        }
      };

      console.log('🔧 [LiveInterview] Session config:', JSON.stringify(sessionConfig, null, 2));

      // Initialize session with correct model and configuration
      console.log('🔌 [LiveInterview] Connecting to Gemini Live API...');
      this.session = await this.client.live.connect(sessionConfig);
      console.log('✅ [LiveInterview] Session created successfully');

      // Start audio capture after session is established
      console.log('🎤 [LiveInterview] Starting audio capture...');
      await this.startAudioCapture();
      console.log('✅ [LiveInterview] Audio capture started');

    } catch (error) {
      console.error('❌ [LiveInterview] Failed to start session:', error);
      this.updateState('error');
      this.config.onError(`Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleMessage(message: LiveServerMessage): Promise<void> {
    try {
      // Handle audio response from AI like the working example
      const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;
      
      if (audio?.data) {
        this.nextStartTime = Math.max(
          this.nextStartTime,
          this.outputAudioContext?.currentTime ?? 0
        );

        // Decode audio data similar to working example
        const audioBuffer = await this.decodeAudioData(audio.data);
        const source = this.outputAudioContext?.createBufferSource();
        if (source && this.outputNode) {
          source.buffer = audioBuffer;
          source.connect(this.outputNode);
          source.addEventListener('ended', () => {
            this.sources.delete(source);
          });

          source.start(this.nextStartTime);
          this.nextStartTime = this.nextStartTime + (audioBuffer.duration ?? 0);
          this.sources.add(source);
        }

        // Handle AI voice response callback
        this.config.onAudioReceived(audio.data);
      }

      // Handle interruption like working example
      const interrupted = message.serverContent?.interrupted;
      if (interrupted) {
        for (const source of this.sources.values()) {
          source.stop();
          this.sources.delete(source);
        }
        this.nextStartTime = this.outputAudioContext?.currentTime ?? 0;
      }

      // Handle transcript if available (optional)
      const transcript = message.serverContent?.modelTurn?.parts?.[0]?.text;
      if (transcript && this.config.onTranscriptReceived) {
        this.config.onTranscriptReceived(transcript);
      }

    } catch (error) {
      console.error('Error handling message:', error);
    }
  }



  private async decodeAudioData(base64Data: string): Promise<AudioBuffer> {
    if (!this.outputAudioContext) {
      throw new Error('Output audio context not initialized');
    }

    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Convert PCM data to AudioBuffer
    // Gemini Live API sends PCM data at 24kHz sample rate, 16-bit, mono
    const SAMPLE_RATE = 24000;
    const CHANNELS = 1;
    
    // Convert Uint8Array to Int16Array (PCM 16-bit data)
    const pcm16Data = new Int16Array(bytes.buffer);
    
    // Create AudioBuffer
    const audioBuffer = this.outputAudioContext.createBuffer(
      CHANNELS, 
      pcm16Data.length, 
      SAMPLE_RATE
    );
    
    // Convert Int16 PCM to Float32 for AudioBuffer
    const channelData = audioBuffer.getChannelData(0);
    for (const [i, sample] of pcm16Data.entries()) {
      channelData[i] = sample / 32768.0; // Convert to -1.0 to 1.0 range
    }
    
    return audioBuffer;
  }

  private stopAllAudioSources(): void {
    for (const source of this.sources.values()) {
      source.stop();
      this.sources.delete(source);
    }
    if (this.outputAudioContext) {
      this.nextStartTime = this.outputAudioContext.currentTime;
    }
  }

  private async startAudioCapture(): Promise<void> {
    try {
      if (!this.inputAudioContext) {
        throw new Error('Input audio context not initialized');
      }

      await this.inputAudioContext.resume();

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
      
      const bufferSize = 256;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(bufferSize, 1, 1);

      this.scriptProcessorNode.onaudioprocess = (event) => {
        if (this.state !== 'connected' || !this.session) return;

        const inputBuffer = event.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);
        
        // Send audio data as blob like the working example
        if (this.session) {
          this.session.sendRealtimeInput({
            media: this.createAudioBlob(pcmData)
          });
        }
      };

      if (this.sourceNode && this.scriptProcessorNode && this.inputAudioContext) {
        this.sourceNode.connect(this.scriptProcessorNode);
        this.scriptProcessorNode.connect(this.inputAudioContext.destination);
      }

    } catch (error) {
      console.error('Failed to start audio capture:', error);
      this.updateState('error');
      this.config.onError(`Failed to start audio capture: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createAudioBlob(pcmData: Float32Array): GeminiBlob {
    // Convert Float32Array to Int16Array like the working example
    const int16Data = new Int16Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      const sample = pcmData[i];
      if (sample !== undefined) {
        int16Data[i] = Math.max(-32768, Math.min(32767, sample * 32768));
      }
    }
    
    // Create blob from the Int16Array buffer using GeminiBlob type
    return new Blob([int16Data.buffer], { type: 'audio/pcm' }) as GeminiBlob;
  }

  async endSession(): Promise<void> {
    if (this.session) {
      this.session.close();
      this.session = null;
    }

    this.stopAudioCapture();
    this.stopAllAudioSources();
    this.updateState('disconnected');
  }

  private stopAudioCapture(): void {
    if (this.scriptProcessorNode && this.sourceNode) {
      this.scriptProcessorNode.disconnect();
      this.sourceNode.disconnect();
      this.scriptProcessorNode = null;
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  getState(): LiveSessionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }
} 