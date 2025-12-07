// Pipeline controller for async TTS generation and playback

import type { TTSOptions, AudioData } from "../types.ts";
import type { TTSProvider } from "../tts/provider.ts";
import type { AudioPlayer } from "../audio/player.ts";
import { AsyncQueue } from "./queue.ts";

export interface PipelineConfig {
  maxBufferSize: number; // Max chunks to buffer ahead
}

export class PipelineController {
  private provider: TTSProvider;
  private player: AudioPlayer;
  private config: PipelineConfig;

  private abortController: AbortController | null = null;
  private isRunning = false;

  constructor(
    provider: TTSProvider,
    player: AudioPlayer,
    config: PipelineConfig
  ) {
    this.provider = provider;
    this.player = player;
    this.config = config;
  }

  async runPipeline(chunks: string[], options?: TTSOptions): Promise<void> {
    if (this.isRunning) {
      throw new Error("Pipeline is already running");
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    const queue = new AsyncQueue<AudioData>();

    try {
      // Start both workers concurrently
      const generatorPromise = this.generatorWorker(
        chunks,
        queue,
        options,
        this.abortController.signal
      );

      const playerPromise = this.playerWorker(
        queue,
        this.abortController.signal
      );

      // Wait for both to complete
      await Promise.all([generatorPromise, playerPromise]);
    } catch (error) {
      // Ensure queue is aborted on any error
      if (!queue.isClosed()) {
        queue.abort(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  private async generatorWorker(
    chunks: string[],
    queue: AsyncQueue<AudioData>,
    options: TTSOptions | undefined,
    signal: AbortSignal
  ): Promise<void> {
    try {
      for (let i = 0; i < chunks.length; i++) {
        // Check for abort before generating
        if (signal.aborted) {
          break;
        }

        const chunkText = chunks[i];

        // Skip empty chunks
        if (!chunkText.trim()) {
          continue;
        }

        // Wait if buffer is full
        while (queue.size() >= this.config.maxBufferSize && !signal.aborted) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (signal.aborted) {
          break;
        }

        try {
          const audioData = await this.provider.synthesize(chunkText, options);

          // Check abort again after async operation
          if (signal.aborted) {
            break;
          }

          queue.push(audioData);
        } catch (error) {
          // Generation error - abort the whole pipeline
          queue.abort(
            error instanceof Error ? error : new Error(String(error))
          );
          throw error;
        }
      }
    } finally {
      // Signal that no more chunks will be generated
      if (!queue.isClosed()) {
        queue.close();
      }
    }
  }

  private async playerWorker(
    queue: AsyncQueue<AudioData>,
    signal: AbortSignal
  ): Promise<void> {
    while (true) {
      // Check for abort before pulling
      if (signal.aborted) {
        break;
      }

      const audioData = await queue.pull();

      // Check for error after pull
      if (queue.hasError()) {
        throw queue.getError();
      }

      // null means queue is closed and empty
      if (audioData === null) {
        break;
      }

      // Check abort again after waiting
      if (signal.aborted) {
        break;
      }

      try {
        await this.player.playAudio(audioData.buffer);
      } catch (error) {
        // Playback error - only throw if not due to stop()
        if (!signal.aborted) {
          throw error;
        }
        break;
      }
    }
  }

  stop(): void {
    // 1. Signal abort to both workers
    if (this.abortController) {
      this.abortController.abort();
    }

    // 2. Stop current audio playback
    this.player.stop();
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
