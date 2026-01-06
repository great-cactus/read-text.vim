// MeloTTS TTS Provider

import { CommandBasedProvider } from "./base_provider.ts";
import type { TTSOptions, AudioData } from "../types.ts";

export class MeloProvider extends CommandBasedProvider {
  protected readonly providerName = "melo";

  protected async doSynthesize(
    text: string,
    options?: TTSOptions
  ): Promise<AudioData> {
    await this.ensureTempDir();
    const outputPath = this.createTempPath("output", "wav");
    const scriptPath = this.createTempPath("script", "py");

    try {
      await this.createScript(scriptPath, text, outputPath, options);
      await this.runMeloTTS(scriptPath, outputPath);
      const audioData = await Deno.readFile(outputPath);
      return {
        buffer: audioData.buffer,
        format: "wav",
      };
    } finally {
      await this.safeRemove(scriptPath);
      if (this.config.autoCleanup) {
        await this.safeRemove(outputPath);
      }
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
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

  private async createScript(
    scriptPath: string,
    text: string,
    outputPath: string,
    options?: TTSOptions
  ): Promise<void> {
    const language = this.getLanguageFromSpeaker(options?.voice);
    const speaker = options?.voice ?? this.config.meloSpeaker;
    const speed = options?.speed ?? this.config.speed;

    const escapedText = text
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");

    const pythonScript = `
from melo.api import TTS

language = '${language}'
speaker = '${speaker}'
speed = ${speed}
device = '${this.config.meloDevice}'
text = "${escapedText}"
output_path = '${outputPath}'

model = TTS(language=language, device=device)
speaker_ids = model.hps.data.spk2id
if speaker in speaker_ids:
    speaker_id = speaker_ids[speaker]
else:
    speaker_id = list(speaker_ids.values())[0]

model.tts_to_file(text, speaker_id, output_path, speed=speed)
`;
    await Deno.writeTextFile(scriptPath, pythonScript);
  }

  private async runMeloTTS(
    scriptPath: string,
    outputPath: string
  ): Promise<void> {
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

    try {
      await Deno.stat(outputPath);
    } catch {
      throw new Error(`MeloTTS failed to generate audio file: ${outputPath}`);
    }
  }

  private getLanguageFromSpeaker(speaker?: string): string {
    if (speaker) {
      const match = speaker.match(/^([A-Z]+)/);
      if (match) {
        return match[1];
      }
    }
    return this.config.meloLanguage;
  }
}
