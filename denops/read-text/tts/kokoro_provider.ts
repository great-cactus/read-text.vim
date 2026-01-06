// kokoro-tts TTS Provider

import { CommandBasedProvider } from "./base_provider.ts";
import { checkCommandExists, fileExists, expandPath } from "./utils.ts";
import type { TTSOptions, AudioData } from "../types.ts";

export class KokoroProvider extends CommandBasedProvider {
  protected readonly providerName = "kokoro";

  protected async doSynthesize(
    text: string,
    options?: TTSOptions
  ): Promise<AudioData> {
    await this.ensureTempDir();
    const inputPath = this.createTempPath("input", "txt");
    const outputPath = this.createTempPath("output", "wav");

    try {
      await Deno.writeTextFile(inputPath, text);
      await this.runKokoro(inputPath, outputPath, options);
      const audioData = await Deno.readFile(outputPath);
      return {
        buffer: audioData.buffer,
        format: "wav",
      };
    } finally {
      await this.safeRemove(inputPath);
      await this.safeRemove(outputPath);
    }
  }

  async checkConnection(): Promise<boolean> {
    const commandOk = await checkCommandExists(this.config.kokoroCommand, [
      "--help",
    ]);
    if (!commandOk) return false;

    const modelPath = expandPath(this.config.kokoroModelPath);
    const voicesPath = expandPath(this.config.kokoroVoicesPath);

    const modelExists = await fileExists(modelPath);
    const voicesExists = await fileExists(voicesPath);

    return modelExists && voicesExists;
  }

  private async runKokoro(
    inputPath: string,
    outputPath: string,
    options?: TTSOptions
  ): Promise<void> {
    const args: string[] = [inputPath, outputPath];

    args.push("--model", expandPath(this.config.kokoroModelPath));
    args.push("--voices", expandPath(this.config.kokoroVoicesPath));
    args.push("--lang", this.config.kokoroLang);

    const voice = options?.voice || this.config.kokoroVoice;
    if (voice) {
      args.push("--voice", voice);
    }

    const speed = options?.speed ?? this.config.speed;
    args.push("--speed", speed.toString());
    args.push("--format", this.config.kokoroFormat || "wav");

    const command = new Deno.Command(this.config.kokoroCommand, {
      args,
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
