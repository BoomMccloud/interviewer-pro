import React, { useRef, useCallback, useEffect } from 'react';

// AudioWorklet processor code (isolated)
const improvedAudioWorkletCode = `
class ImprovedRecorderProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'isRecording',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate'
      }
    ];
  }

  constructor() {
    super();
    this._bufferSize = 2048; // Efficient buffer size
    this._buffer = new Float32Array(this._bufferSize);
    this._initBuffer();
  }

  _initBuffer() {
    this._bytesWritten = 0;
  }

  _isBufferEmpty() {
    return this._bytesWritten === 0;
  }

  _isBufferFull() {
    return this._bytesWritten === this._bufferSize;
  }

  _appendToBuffer(value) {
    if (this._isBufferFull()) {
      this._flush();
    }

    this._buffer[this._bytesWritten] = value;
    this._bytesWritten += 1;
  }

  _flush() {
    let buffer = this._buffer;
    if (this._bytesWritten < this._bufferSize) {
      buffer = buffer.slice(0, this._bytesWritten);
    }

    // Calculate amplitude for logging
    const maxAmplitude = Math.max(...buffer.map(Math.abs));

    this.port.postMessage({
      eventType: 'data',
      audioBuffer: buffer,
      amplitude: maxAmplitude
    });

    this._initBuffer();
  }

  _recordingStopped() {
    if (!this._isBufferEmpty()) {
      this._flush(); // Flush remaining data
    }
    
    this.port.postMessage({
      eventType: 'stop'
    });
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const isRecordingValues = parameters.isRecording;
    const inputChannel = input[0];

    // Handle both constant and changing parameter values (per Chrome docs)
    if (isRecordingValues.length === 1) {
      // Constant value for entire render quantum (128 samples)
      const shouldRecord = isRecordingValues[0] === 1;
      
      if (!shouldRecord && !this._isBufferEmpty()) {
        this._flush();
        this._recordingStopped();
      }

      if (shouldRecord) {
        // Process entire buffer at once for efficiency
        for (let i = 0; i < inputChannel.length; i++) {
          this._appendToBuffer(inputChannel[i]);
        }
      }
    } else {
      // Parameter changes during render quantum - handle per sample
      for (let dataIndex = 0; dataIndex < isRecordingValues.length; dataIndex++) {
        const shouldRecord = isRecordingValues[dataIndex] === 1;
        
        if (!shouldRecord && !this._isBufferEmpty()) {
          this._flush();
          this._recordingStopped();
        }

        if (shouldRecord && dataIndex < inputChannel.length) {
          this._appendToBuffer(inputChannel[dataIndex]);
        }
      }
    }

    return true;
  }
}

registerProcessor('improved-recorder-worklet', ImprovedRecorderProcessor);
`;

// Audio data conversion utility
const createBlob = (pcmData: Float32Array): Blob => {
  const int16Data = new Int16Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    int16Data[i] = Math.max(-32768, Math.min(32767, pcmData[i] * 32768));
  }
  return new Blob([int16Data.buffer], { type: 'audio/pcm' });
};

interface AudioWorkletManagerProps {
  isRecording: boolean;
  onAudioData: (audioBlob: Blob, amplitude: number) => void;
  onStatusUpdate: (status: string) => void;
  onError: (error: string) => void;
}

export const AudioWorkletManager: React.FC<AudioWorkletManagerProps> = ({
  isRecording,
  onAudioData,
  onStatusUpdate,
  onError,
}) => {
  const inputAudioContextRef = useRef<AudioContext>();
  const mediaStreamRef = useRef<MediaStream>();
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode>();
  const recorderNodeRef = useRef<AudioWorkletNode>();
  const isInitializedRef = useRef(false);

  // Initialize audio system
  const initializeAudio = useCallback(async () => {
    if (isInitializedRef.current) return true;

    try {
      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      // Load AudioWorklet
      const blob = new Blob([improvedAudioWorkletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      await inputAudioContextRef.current.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);
      
      onStatusUpdate('✅ AudioWorklet initialized');
      isInitializedRef.current = true;
      return true;
    } catch (err) {
      onError(`Audio initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    }
  }, [onStatusUpdate, onError]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!inputAudioContextRef.current) return false;

    try {
      await inputAudioContextRef.current.resume();
      onStatusUpdate('🎤 Requesting microphone access...');

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });

      onStatusUpdate('✅ Microphone access granted');

      sourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(
        mediaStreamRef.current,
      );

      // Create recorder node
      recorderNodeRef.current = new AudioWorkletNode(
        inputAudioContextRef.current,
        'improved-recorder-worklet'
      );

      // Connect audio pipeline
      sourceNodeRef.current.connect(recorderNodeRef.current);
      recorderNodeRef.current.connect(inputAudioContextRef.current.destination);

      // Set up audio data handler
      recorderNodeRef.current.port.onmessage = (event) => {
        const { eventType, audioBuffer, amplitude } = event.data as {
          eventType: string;
          audioBuffer: Float32Array;
          amplitude: number;
        };

        if (eventType === 'data') {
          if (amplitude > 0.001) {
            console.log(`[AudioWorklet] 🎵 Buffered audio! Size: ${audioBuffer.length}, Amplitude: ${amplitude.toFixed(4)}`);
          }
          onAudioData(createBlob(audioBuffer), amplitude);
        }

        if (eventType === 'stop') {
          console.log('[AudioWorklet] 🛑 Recording stopped by worklet');
        }
      };

      // Start recording using AudioParam
      const isRecordingParam = recorderNodeRef.current.parameters.get('isRecording');
      if (isRecordingParam) {
        isRecordingParam.setValueAtTime(1, inputAudioContextRef.current.currentTime);
      }

      onStatusUpdate('🔴 Recording with AudioWorklet (buffered)...');
      return true;
    } catch (err) {
      onError(`Recording start failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    }
  }, [onAudioData, onStatusUpdate, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    onStatusUpdate('⏹️ Stopping recording...');

    // Stop recording using AudioParam
    if (recorderNodeRef.current && inputAudioContextRef.current) {
      const isRecordingParam = recorderNodeRef.current.parameters.get('isRecording');
      if (isRecordingParam) {
        isRecordingParam.setValueAtTime(0, inputAudioContextRef.current.currentTime);
      }
    }

    // Clean up connections
    if (recorderNodeRef.current && sourceNodeRef.current) {
      recorderNodeRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = undefined;
    }

    recorderNodeRef.current = undefined;
    sourceNodeRef.current = undefined;

    onStatusUpdate('⏸️ Recording stopped');
  }, [onStatusUpdate]);

  // Handle recording state changes
  useEffect(() => {
    if (isRecording) {
      void startRecording();
    } else {
      stopRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Initialize on mount
  useEffect(() => {
    void initializeAudio();
    
    return () => {
      stopRecording();
    };
  }, [initializeAudio, stopRecording]);

  // This component doesn't render anything - it's purely functional
  return null;
};

export default AudioWorkletManager; 