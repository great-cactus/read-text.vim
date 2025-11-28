// VOICEVOX TTS Provider

import type { TTSProvider } from "./provider.ts";
import type { TTSOptions, AudioData, Config } from "../types.ts";

interface AudioQuery {
  accent_phrases: Array<{
    moras: Array<{
      text: string;
      consonant?: string;
      vowel: string;
      pitch: number;
    }>;
    accent: number;
    pause_mora?: {
      text: string;
      vowel: string;
      pitch: number;
    };
    is_interrogative?: boolean;
  }>;
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  outputSamplingRate: number;
  outputStereo: boolean;
  kana?: string;
}

export class VoicevoxProvider implements TTSProvider {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async synthesize(text: string, options?: TTSOptions): Promise<AudioData> {
    if (!text || text.trim().length === 0) {
      throw new Error("VOICEVOX synthesis failed: Text is empty or contains only whitespace");
    }

    const audioQuery = await this.createAudioQuery(text, options);
    const audioBuffer = await this.synthesizeAudio(audioQuery, options);

    return {
      buffer: audioBuffer,
      format: 'wav',
    };
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.voicevoxUrl}/speakers`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async createAudioQuery(text: string, options?: TTSOptions): Promise<AudioQuery> {
    const speakerId = options?.voice
      ? parseInt(options.voice, 10)
      : this.config.voicevoxSpeaker;

    const formData = new FormData();
    formData.append('text', text);
    formData.append('speaker', speakerId.toString());

    const response = await fetch(
      `${this.config.voicevoxUrl}/audio_query`,
      {
        method: "POST",
        body: formData
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`VOICEVOX audio_query failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  private async synthesizeAudio(audioQuery: AudioQuery, options?: TTSOptions): Promise<ArrayBuffer> {
    const speakerId = options?.voice
      ? parseInt(options.voice, 10)
      : this.config.voicevoxSpeaker;

    // Apply speed and pitch from options or config
    audioQuery.speedScale = options?.speed ?? this.config.speed;
    audioQuery.pitchScale = options?.pitch ?? this.config.pitch;

    const response = await fetch(
      `${this.config.voicevoxUrl}/synthesis?speaker=${speakerId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(audioQuery),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`VOICEVOX synthesis failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.arrayBuffer();
  }
}
