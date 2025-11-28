// Audio player for playing synthesized audio

import { play } from "https://deno.land/x/audio@0.2.0/mod.ts";
import type { Config } from "../types.ts";

export class AudioPlayer {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    const tempPath = await this.saveToTempFile(audioBuffer);

    try {
      if (this.config.audioBackend === "deno_audio") {
        await this.playWithDenoAudio(tempPath);
      } else {
        await this.playWithAplay(tempPath);
      }
    } finally {
      if (this.config.autoCleanup) {
        await this.cleanupTempFile(tempPath);
      }
    }
  }

  private async saveToTempFile(audioBuffer: ArrayBuffer): Promise<string> {
    await this.ensureTempDir();
    const timestamp = Date.now();
    const filename = `${this.config.filePrefix}${timestamp}.wav`;
    const tempPath = `${this.config.tempDir}/${filename}`;

    const uint8Array = new Uint8Array(audioBuffer);
    await Deno.writeFile(tempPath, uint8Array);

    return tempPath;
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

  private async playWithDenoAudio(filePath: string): Promise<void> {
    try {
      // Check WSL audio environment
      await this.checkWSLAudioEnvironment();

      // Try playing with deno_audio
      await play(filePath);
    } catch (error) {
      console.warn("deno_audio playback failed, falling back to aplay:", error);
      await this.playWithAplay(filePath);
    }
  }

  private async checkWSLAudioEnvironment(): Promise<void> {
    // Check if running in WSL
    const isWSL = Deno.env.get("WSL_DISTRO_NAME") !== undefined;

    if (isWSL) {
      // Check WSLg PulseAudio server configuration
      const pulseServer = Deno.env.get("PULSE_SERVER");

      if (!pulseServer) {
        console.warn("PULSE_SERVER environment variable not set in WSL");
        console.warn("Please check if WSLg is properly configured");

        // Try default WSLg configuration
        Deno.env.set("PULSE_SERVER", "/mnt/wslg/PulseServer");
      }

      // Check if WSLg PulseServer socket exists
      try {
        const pulseServerPath = pulseServer || "/mnt/wslg/PulseServer";
        await Deno.stat(pulseServerPath);
        console.log("WSLg PulseServer found:", pulseServerPath);
      } catch {
        console.warn("WSLg PulseServer not found. Audio playback may fail");
        console.warn("Please restart WSL: wsl --shutdown");
      }
    }
  }

  private async playWithAplay(filePath: string): Promise<void> {
    const command = new Deno.Command("aplay", {
      args: ["-q", filePath],
      stdout: "null",
      stderr: "null",
    });

    const { success } = await command.output();
    if (!success) {
      throw new Error("aplay command failed");
    }
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await Deno.remove(filePath);
    } catch (error) {
      console.warn(`Failed to cleanup temp file: ${filePath}`, error);
    }
  }
}
