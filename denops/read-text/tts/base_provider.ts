// Abstract base classes for TTS providers

import type { TTSProvider } from "./provider.ts";
import type { TTSOptions, AudioData, Config } from "../types.ts";
import { ensureTempDir, createTempPath, safeRemove } from "./utils.ts";

/**
 * TTS provider validation error
 */
export class TTSValidationError extends Error {
  constructor(provider: string, message: string) {
    super(`${provider} synthesis failed: ${message}`);
    this.name = "TTSValidationError";
  }
}

/**
 * Abstract base class for all TTS providers.
 * Provides common validation and configuration access.
 */
export abstract class BaseTTSProvider implements TTSProvider {
  protected readonly config: Config;
  protected abstract readonly providerName: string;

  constructor(config: Config) {
    this.config = config;
  }

  async synthesize(text: string, options?: TTSOptions): Promise<AudioData> {
    this.validateText(text);
    return this.doSynthesize(text, options);
  }

  protected validateText(text: string): void {
    if (!text || text.trim().length === 0) {
      throw new TTSValidationError(
        this.providerName,
        "Text is empty or contains only whitespace"
      );
    }
  }

  protected abstract doSynthesize(
    text: string,
    options?: TTSOptions
  ): Promise<AudioData>;

  abstract checkConnection(): Promise<boolean>;
}

/**
 * Abstract base class for command-line based TTS providers.
 * Provides temporary file management utilities.
 */
export abstract class CommandBasedProvider extends BaseTTSProvider {
  protected ensureTempDir(): Promise<void> {
    return ensureTempDir(this.config);
  }

  protected createTempPath(suffix: string, extension: string): string {
    return createTempPath(
      this.config,
      this.providerName.toLowerCase(),
      suffix,
      extension
    );
  }

  protected safeRemove(path: string): Promise<void> {
    return safeRemove(path);
  }
}
