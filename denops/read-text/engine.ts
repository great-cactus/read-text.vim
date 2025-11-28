// Read-text engine that integrates all components

import type { Config, TTSOptions } from "./types.ts";
import type { TTSProvider } from "./tts/provider.ts";
import { VoicevoxProvider } from "./tts/voicevox_provider.ts";
import { EspeakProvider } from "./tts/espeak_provider.ts";
import { AudioPlayer } from "./audio/player.ts";

export class ReadTextEngine {
  private config: Config;
  private provider: TTSProvider;
  private player: AudioPlayer;

  constructor(config: Config) {
    this.config = config;
    this.provider = this.createProvider(config);
    this.player = new AudioPlayer(config);
  }

  private createProvider(config: Config): TTSProvider {
    switch (config.ttsProvider) {
      case 'voicevox':
        return new VoicevoxProvider(config);
      case 'espeak':
        return new EspeakProvider(config);
      default:
        throw new Error(`Unknown TTS provider: ${config.ttsProvider}`);
    }
  }

  async readText(text: string, options?: TTSOptions): Promise<void> {
    if (!text.trim()) {
      throw new Error("Empty text provided");
    }

    const lines = text.split('\n');
    if (lines.length > this.config.splitThreshold) {
      await this.readTextInChunks(lines, options);
    } else {
      await this.readSingleText(text, options);
    }
  }

  private async readTextInChunks(lines: string[], options?: TTSOptions): Promise<void> {
    for (let i = 0; i < lines.length; i += this.config.splitThreshold) {
      const chunk = lines.slice(i, i + this.config.splitThreshold).join('\n');
      if (chunk.trim()) {
        await this.readSingleText(chunk, options);
      }
    }
  }

  private async readSingleText(text: string, options?: TTSOptions): Promise<void> {
    try {
      const audioData = await this.provider.synthesize(text, options);
      await this.player.playAudio(audioData.buffer);
    } catch (error) {
      throw new Error(`Text-to-speech failed: ${error.message}`);
    }
  }

  async checkConnection(): Promise<boolean> {
    return await this.provider.checkConnection();
  }
}
