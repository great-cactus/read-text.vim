// espeak/espeak-ng TTS Provider

import type { TTSProvider } from "./provider.ts";
import type { TTSOptions, AudioData, Config } from "../types.ts";

export class EspeakProvider implements TTSProvider {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async synthesize(text: string, options?: TTSOptions): Promise<AudioData> {
    if (!text || text.trim().length === 0) {
      throw new Error("espeak synthesis failed: Text is empty or contains only whitespace");
    }

    const audioBuffer = await this.generateAudio(text, options);

    return {
      buffer: audioBuffer,
      format: 'wav',
    };
  }

  async checkConnection(): Promise<boolean> {
    try {
      const command = new Deno.Command(this.config.espeakCommand, {
        args: ["--version"],
        stdout: "null",
        stderr: "null",
      });

      const { success } = await command.output();
      return success;
    } catch {
      return false;
    }
  }

  private async generateAudio(text: string, options?: TTSOptions): Promise<ArrayBuffer> {
    // Create temporary file for output
    const tempPath = await this.createTempFile();

    try {
      await this.runEspeak(text, tempPath, options);
      const audioData = await Deno.readFile(tempPath);
      return audioData.buffer;
    } finally {
      // Cleanup temporary file
      try {
        await Deno.remove(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private async createTempFile(): Promise<string> {
    await this.ensureTempDir();
    const timestamp = Date.now();
    const filename = `${this.config.filePrefix}espeak_${timestamp}.wav`;
    return `${this.config.tempDir}/${filename}`;
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await Deno.mkdir(this.config.tempDir, { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        throw error;
      }
    }
  }

  private async runEspeak(text: string, outputPath: string, options?: TTSOptions): Promise<void> {
    const args: string[] = [];

    // Build voice string: language + variant
    const voice = this.buildVoiceString(options?.voice);
    if (voice) {
      args.push("-v", voice);
    }

    // Speed: normalized 0.5-2.0 to espeak's WPM (80-450)
    // Default is 175 WPM, so 1.0 = 175
    const speed = options?.speed ?? this.config.speed;
    const wpm = Math.round(175 * speed);
    args.push("-s", wpm.toString());

    // Pitch: normalized -1.0-1.0 to espeak's 0-99 (default 50)
    // -1.0 -> 0, 0.0 -> 50, 1.0 -> 99
    const pitch = options?.pitch ?? this.config.pitch;
    const espeakPitch = Math.round(50 + pitch * 49);
    args.push("-p", espeakPitch.toString());

    // Output to WAV file
    args.push("-w", outputPath);

    // Text to speak
    args.push(text);

    const command = new Deno.Command(this.config.espeakCommand, {
      args: args,
      stdout: "null",
      stderr: "piped",
    });

    const { success, stderr } = await command.output();

    if (!success) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`espeak command failed: ${errorText}`);
    }
  }

  private buildVoiceString(voiceOption?: string): string {
    // If voice option is provided, use it directly
    if (voiceOption) {
      return voiceOption;
    }

    // Otherwise, build from config
    let voice = this.config.espeakVoice;

    // Add variant (gender) if specified
    if (this.config.espeakVariant) {
      voice = `${voice}+${this.config.espeakVariant}`;
    }

    return voice;
  }
}
