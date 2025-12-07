// Common type definitions for read-text.vim

// Re-export parser types for convenience
export type {
  ReadingRule,
  CommandRule,
  RangeExcludeRule,
  SimpleExcludeRule,
  ReplaceRule,
  LanguagePreset,
  ReadingRulesConfig,
} from './parser/types.ts';

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
  ttsProvider: 'voicevox' | 'espeak' | 'melo' | 'kokoro';

  // VOICEVOX settings
  voicevoxUrl: string;
  voicevoxSpeaker: number;

  // espeak settings
  espeakVoice: string;      // Language code (e.g., 'en', 'ja')
  espeakVariant: string;    // Voice variant: 'm1'-'m7', 'f1'-'f4', or ''
  espeakCommand: string;    // Command name: 'espeak' or 'espeak-ng'

  // MeloTTS settings
  meloLanguage: string;     // Language: EN, JP, ES, FR, CN, KR
  meloSpeaker: string;      // Speaker: EN-US, EN-BR, EN-AU, EN-INDIA, JP, etc.
  meloDevice: string;       // Device: auto, cpu, cuda
  meloPython: string;       // Python command: python, python3

  // kokoro-tts settings
  kokoroCommand: string;    // Command name: kokoro-tts
  kokoroModelPath: string;  // Path to kokoro-v1.0.onnx model file
  kokoroVoicesPath: string; // Path to voices-v1.0.bin file
  kokoroLang: string;       // Language: en-us, en-gb, ja, cmn, fr-fr, it
  kokoroVoice: string;      // Voice: af_sarah, bf_alice, jf_alpha, etc.
  kokoroFormat: string;     // Audio format: wav or mp3

  // Common settings
  speed: number;            // 0.5-2.0
  pitch: number;            // -1.0-1.0

  // File management
  tempDir: string;
  filePrefix: string;
  autoCleanup: boolean;

  // Audio playback
  audioBackend: string;
  audioCommand: string;
  audioArgs: string[];

  // Text processing
  splitThreshold: number;

  // Pipeline settings
  pipelineBufferSize: number;

  // Reading rules
  readingRulesEnabled: boolean;
  readingRulesPresets: string[];
  readingRulesMode: 'override' | 'extend';
}
