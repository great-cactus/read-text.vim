// espeak/espeak-ng TTS Provider

import { CommandBasedProvider } from "./base_provider.ts";
import { checkCommandExists } from "./utils.ts";
import type { TTSOptions, AudioData } from "../types.ts";

export class EspeakProvider extends CommandBasedProvider {
  protected readonly providerName = "espeak";

  protected async doSynthesize(
    text: string,
    options?: TTSOptions
  ): Promise<AudioData> {
    await this.ensureTempDir();
    const outputPath = this.createTempPath("output", "wav");

    try {
      await this.runEspeak(text, outputPath, options);
      const audioData = await Deno.readFile(outputPath);
      return {
        buffer: audioData.buffer,
        format: "wav",
      };
    } finally {
      await this.safeRemove(outputPath);
    }
  }

  async checkConnection(): Promise<boolean> {
    return checkCommandExists(this.config.espeakCommand, ["--version"]);
  }

  private async runEspeak(
    text: string,
    outputPath: string,
    options?: TTSOptions
  ): Promise<void> {
    const args: string[] = [];

    const voice = this.buildVoiceString(options?.voice);
    if (voice) {
      args.push("-v", voice);
    }

    // Speed: normalized 0.5-2.0 to espeak's WPM (default 175)
    const speed = options?.speed ?? this.config.speed;
    const wpm = Math.round(175 * speed);
    args.push("-s", wpm.toString());

    // Pitch: normalized -1.0-1.0 to espeak's 0-99 (default 50)
    const pitch = options?.pitch ?? this.config.pitch;
    const espeakPitch = Math.round(50 + pitch * 49);
    args.push("-p", espeakPitch.toString());

    args.push("-w", outputPath);
    args.push(text);

    const command = new Deno.Command(this.config.espeakCommand, {
      args,
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
    if (voiceOption) {
      return voiceOption;
    }

    let voice = this.config.espeakVoice;
    if (this.config.espeakVariant) {
      voice = `${voice}+${this.config.espeakVariant}`;
    }
    return voice;
  }
}
