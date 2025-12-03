// kokoro-tts TTS Provider

import type { TTSProvider } from "./provider.ts";
import type { TTSOptions, AudioData, Config } from "../types.ts";

export class KokoroProvider implements TTSProvider {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async synthesize(text: string, options?: TTSOptions): Promise<AudioData> {
    if (!text || text.trim().length === 0) {
      throw new Error("kokoro synthesis failed: Text is empty or contains only whitespace");
    }

    const audioBuffer = await this.generateAudio(text, options);

    return {
      buffer: audioBuffer,
      format: 'wav',
    };
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Check command existence
      const command = new Deno.Command(this.config.kokoroCommand, {
        args: ["--help"],
        stdout: "null",
        stderr: "null",
      });

      const { success } = await command.output();
      if (!success) return false;

      // Check model files existence
      const modelExists = await this.fileExists(this.config.kokoroModelPath);
      const voicesExists = await this.fileExists(this.config.kokoroVoicesPath);

      return modelExists && voicesExists;
    } catch {
      return false;
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      const expandedPath = this.expandPath(path);
      await Deno.stat(expandedPath);
      return true;
    } catch {
      return false;
    }
  }

  private expandPath(path: string): string {
    return path.replace(/^~/, Deno.env.get("HOME") || "~");
  }

  private async generateAudio(text: string, options?: TTSOptions): Promise<ArrayBuffer> {
    // Create temporary files for input and output
    const inputPath = await this.createTempFile("input", "txt");
    const outputPath = await this.createTempFile("output", "wav");

    try {
      // Write input text to temporary file
      await Deno.writeTextFile(inputPath, text);

      // Run kokoro-tts command
      await this.runKokoro(inputPath, outputPath, options);

      // Read output audio file
      const audioData = await Deno.readFile(outputPath);
      return audioData.buffer;
    } finally {
      // Cleanup temporary files
      try {
        await Deno.remove(inputPath);
      } catch {
        // Ignore cleanup errors
      }
      try {
        await Deno.remove(outputPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private async createTempFile(prefix: string, extension: string): Promise<string> {
    await this.ensureTempDir();
    const timestamp = Date.now();
    const filename = `${this.config.filePrefix}kokoro_${prefix}_${timestamp}.${extension}`;
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

  private async runKokoro(inputPath: string, outputPath: string, options?: TTSOptions): Promise<void> {
    const args: string[] = [inputPath, outputPath];

    // Model and voices file paths
    args.push("--model", this.expandPath(this.config.kokoroModelPath));
    args.push("--voices", this.expandPath(this.config.kokoroVoicesPath));

    // Language setting
    args.push("--lang", this.config.kokoroLang);

    // Voice setting (use options.voice if provided, otherwise use config)
    const voice = options?.voice || this.config.kokoroVoice;
    if (voice) {
      args.push("--voice", voice);
    }

    // Speed setting: normalized 0.5-2.0
    const speed = options?.speed ?? this.config.speed;
    args.push("--speed", speed.toString());

    // Output format
    args.push("--format", this.config.kokoroFormat || "wav");

    // Run kokoro-tts command
    const command = new Deno.Command(this.config.kokoroCommand, {
      args: args,
      stdout: "null",
      stderr: "piped",
    });

    const { success, stderr } = await command.output();

    if (!success) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`kokoro-tts command failed: ${errorText}`);
    }
  }
}
