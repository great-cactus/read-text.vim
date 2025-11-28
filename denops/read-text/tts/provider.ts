// TTS Provider interface

import type { TTSOptions, AudioData } from "../types.ts";

export interface TTSProvider {
  // Synthesize text to audio data
  synthesize(text: string, options?: TTSOptions): Promise<AudioData>;

  // Check connection/availability
  checkConnection(): Promise<boolean>;
}
