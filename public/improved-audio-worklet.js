/**
 * Improved Audio Worklet Processor
 * 
 * Handles real-time audio processing for Gemini Live API integration.
 * Features:
 * - 256-sample buffering for optimal performance
 * - Configurable recording state via parameter
 * - Float32Array output for compatibility with Gemini Live API
 * - Professional audio processing with proper sample handling
 */

class ImprovedAudioWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Buffer for collecting audio samples
    this.audioBuffer = new Float32Array(256);
    this.bufferIndex = 0;
    
    // Recording state - controlled by parameter
    this.isRecording = false;
    
    console.log('[AudioWorklet] ImprovedAudioWorklet initialized');
  }

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

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const isRecordingParam = parameters.isRecording;
    
    // Update recording state from parameter
    this.isRecording = isRecordingParam[0] === 1;
    
    // Only process if we have input and are recording
    if (!this.isRecording || !input || !input[0]) {
      return true;
    }
    
    const inputChannel = input[0]; // First channel (mono)
    
    // Process each sample in the input
    for (let i = 0; i < inputChannel.length; i++) {
      // Add sample to buffer
      this.audioBuffer[this.bufferIndex] = inputChannel[i];
      this.bufferIndex++;
      
      // When buffer is full, send it and reset
      if (this.bufferIndex >= 256) {
        // Create a copy of the buffer to send
        const bufferCopy = new Float32Array(this.audioBuffer);
        
        // Send buffer via message port
        this.port.postMessage({
          audioBuffer: bufferCopy
        });
        
        // Reset buffer index
        this.bufferIndex = 0;
      }
    }
    
    return true; // Keep processor alive
  }
}

// Register the processor
registerProcessor('improved-audio-worklet', ImprovedAudioWorklet); 