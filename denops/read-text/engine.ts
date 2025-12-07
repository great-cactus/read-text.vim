// Read-text engine that integrates all components

import type { Config, TTSOptions } from "./types.ts";
import type { TTSProvider } from "./tts/provider.ts";
import { VoicevoxProvider } from "./tts/voicevox_provider.ts";
import { EspeakProvider } from "./tts/espeak_provider.ts";
import { MeloProvider } from "./tts/melo_provider.ts";
import { KokoroProvider } from "./tts/kokoro_provider.ts";
import { AudioPlayer } from "./audio/player.ts";
import { PipelineController } from "./async/pipeline.ts";

export class ReadTextEngine {
  private config: Config;
  private provider: TTSProvider;
  private player: AudioPlayer;
  private pipeline: PipelineController | null = null;

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
      case 'melo':
        return new MeloProvider(config);
      case 'kokoro':
        return new KokoroProvider(config);
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
      await this.readTextWithPipeline(lines, options);
    } else {
      await this.readSingleText(text, options);
    }
  }

  private async readTextWithPipeline(
    lines: string[],
    options?: TTSOptions
  ): Promise<void> {
    // Build chunk list
    const chunks: string[] = [];
    for (let i = 0; i < lines.length; i += this.config.splitThreshold) {
      const chunk = lines.slice(i, i + this.config.splitThreshold).join('\n');
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }

    if (chunks.length === 0) {
      return;
    }

    // Single chunk: use direct playback (no pipeline overhead)
    if (chunks.length === 1) {
      await this.readSingleText(chunks[0], options);
      return;
    }

    // Multiple chunks: use pipeline
    this.pipeline = new PipelineController(this.provider, this.player, {
      maxBufferSize: this.config.pipelineBufferSize,
    });

    try {
      await this.pipeline.runPipeline(chunks, options);
    } finally {
      this.pipeline = null;
    }
  }

  private async readSingleText(text: string, options?: TTSOptions): Promise<void> {
    try {
      const audioData = await this.provider.synthesize(text, options);
      await this.player.playAudio(audioData.buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Text-to-speech failed: ${message}`);
    }
  }

  async checkConnection(): Promise<boolean> {
    return await this.provider.checkConnection();
  }

  stop(): void {
    // Stop pipeline if running
    if (this.pipeline) {
      this.pipeline.stop();
    }
    // Also stop player directly (for single-text case)
    this.player.stop();
  }
}
