// MeloTTS TTS Provider

import type { TTSProvider } from "./provider.ts";
import type { TTSOptions, AudioData, Config } from "../types.ts";

export class MeloProvider implements TTSProvider {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async synthesize(text: string, options?: TTSOptions): Promise<AudioData> {
    if (!text || text.trim().length === 0) {
      throw new Error("MeloTTS synthesis failed: Text is empty or contains only whitespace");
    }

    const audioBuffer = await this.generateAudio(text, options);

    return {
      buffer: audioBuffer,
      format: 'wav',
    };
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Check if Python and MeloTTS are available by trying to import
      const checkScript = `
import sys
try:
    from melo.api import TTS
    sys.exit(0)
except ImportError:
    sys.exit(1)
`;

      const command = new Deno.Command(this.config.meloPython, {
        args: ["-c", checkScript],
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
    // Create temporary files
    const outputPath = await this.createTempOutputPath();
    const scriptPath = await this.createTempScript(text, outputPath, options);

    try {
      await this.runMeloTTS(scriptPath, outputPath);
      const audioData = await Deno.readFile(outputPath);
      return audioData.buffer;
    } finally {
      // Cleanup temporary files
      try {
        await Deno.remove(scriptPath);
      } catch {
        // Ignore cleanup errors
      }

      if (this.config.autoCleanup) {
        try {
          await Deno.remove(outputPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  private async createTempScript(text: string, outputPath: string, options?: TTSOptions): Promise<string> {
    await this.ensureTempDir();

    const timestamp = Date.now();
    const scriptPath = `${this.config.tempDir}/${this.config.filePrefix}melo_${timestamp}.py`;

    // Determine language and speaker
    const language = this.getLanguageFromSpeaker(options?.voice);
    const speaker = options?.voice ?? this.config.meloSpeaker;
    const speed = options?.speed ?? this.config.speed;

    // Escape text for Python string
    const escapedText = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

    const pythonScript = `
from melo.api import TTS

# Configuration
language = '${language}'
speaker = '${speaker}'
speed = ${speed}
device = '${this.config.meloDevice}'
text = "${escapedText}"
output_path = '${outputPath}'

# Initialize TTS model
model = TTS(language=language, device=device)

# Get speaker ID
speaker_ids = model.hps.data.spk2id
if speaker in speaker_ids:
    speaker_id = speaker_ids[speaker]
else:
    # Fallback to first available speaker
    speaker_id = list(speaker_ids.values())[0]

# Generate speech
model.tts_to_file(text, speaker_id, output_path, speed=speed)
`;

    await Deno.writeTextFile(scriptPath, pythonScript);
    return scriptPath;
  }

  private async createTempOutputPath(): Promise<string> {
    await this.ensureTempDir();
    const timestamp = Date.now();
    return `${this.config.tempDir}/${this.config.filePrefix}melo_${timestamp}.wav`;
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

  private async runMeloTTS(scriptPath: string, outputPath: string): Promise<void> {
    const command = new Deno.Command(this.config.meloPython, {
      args: [scriptPath],
      stdout: "piped",
      stderr: "piped",
    });

    const { success, stderr } = await command.output();

    if (!success) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`MeloTTS execution failed: ${errorText}`);
    }

    // Verify output file was created
    try {
      await Deno.stat(outputPath);
    } catch {
      throw new Error(`MeloTTS failed to generate audio file: ${outputPath}`);
    }
  }

  private getLanguageFromSpeaker(speaker?: string): string {
    // If custom speaker is provided via options, extract language
    if (speaker) {
      // Speaker format is usually like 'EN-US', 'EN-BR', 'JP', etc.
      const match = speaker.match(/^([A-Z]+)/);
      if (match) {
        return match[1];
      }
    }

    // Otherwise, use configured language
    return this.config.meloLanguage;
  }
}
