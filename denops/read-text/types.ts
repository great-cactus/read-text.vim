// Common type definitions for read-text.vim

export interface TTSOptions {
  speed?: number;      // 0.5-2.0 (normalized)
  pitch?: number;      // -1.0-1.0 (normalized)
  voice?: string;      // Provider-specific voice ID
}

export interface AudioData {
  buffer: ArrayBuffer;  // Audio data
  format: 'wav';        // Audio format
}

export interface Config {
  // TTS provider selection
  ttsProvider: 'voicevox' | 'espeak';

  // VOICEVOX settings
  voicevoxUrl: string;
  voicevoxSpeaker: number;

  // espeak settings
  espeakVoice: string;      // Language code (e.g., 'en', 'ja')
  espeakVariant: string;    // Voice variant: 'm1'-'m7', 'f1'-'f4', or ''
  espeakCommand: string;    // Command name: 'espeak' or 'espeak-ng'

  // Common settings
  speed: number;            // 0.5-2.0
  pitch: number;            // -1.0-1.0

  // File management
  tempDir: string;
  filePrefix: string;
  autoCleanup: boolean;

  // Audio playback
  audioBackend: string;

  // Text processing
  splitThreshold: number;
}
