import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import { batch, collect } from "https://deno.land/x/denops_std@v6.4.0/batch/mod.ts";
import { play } from "https://deno.land/x/audio@0.2.0/mod.ts";

interface VoicevoxConfig {
  url: string;
  speakerId: number;
  speedScale: number;
  pitchScale: number;
  tempDir: string;
  filePrefix: string;
  autoCleanup: boolean;
  audioBackend: string;
  splitThreshold: number;
}

interface AudioQuery {
  accent_phrases: Array<{
    moras: Array<{
      text: string;
      consonant?: string;
      vowel: string;
      pitch: number;
    }>;
    accent: number;
    pause_mora?: {
      text: string;
      vowel: string;
      pitch: number;
    };
    is_interrogative?: boolean;
  }>;
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  outputSamplingRate: number;
  outputStereo: boolean;
  kana?: string;
}

class VoicevoxClient {
  private config: VoicevoxConfig;

  constructor(config: VoicevoxConfig) {
    this.config = config;
  }

  async createAudioQuery(text: string, speakerId?: number): Promise<AudioQuery> {
    const sid = speakerId ?? this.config.speakerId;
    const response = await fetch(
      `${this.config.url}/audio_query?text=${encodeURIComponent(text)}&speaker=${sid}`,
      { method: "POST" }
    );

    if (!response.ok) {
      throw new Error(`VOICEVOX audio_query failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async synthesize(audioQuery: AudioQuery, speakerId?: number): Promise<ArrayBuffer> {
    const sid = speakerId ?? this.config.speakerId;
    audioQuery.speedScale = this.config.speedScale;
    audioQuery.pitchScale = this.config.pitchScale;

    const response = await fetch(
      `${this.config.url}/synthesis?speaker=${sid}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(audioQuery),
      }
    );

    if (!response.ok) {
      throw new Error(`VOICEVOX synthesis failed: ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }

  async textToSpeech(text: string, speakerId?: number): Promise<ArrayBuffer> {
    const audioQuery = await this.createAudioQuery(text, speakerId);
    return await this.synthesize(audioQuery, speakerId);
  }
}

class AudioPlayer {
  private config: VoicevoxConfig;

  constructor(config: VoicevoxConfig) {
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
      // WSL環境での音声設定チェック
      await this.checkWSLAudioEnvironment();
      
      // deno_audioで音声再生を試行
      await play(filePath);
    } catch (error) {
      console.warn("deno_audio playback failed, falling back to aplay:", error);
      await this.playWithAplay(filePath);
    }
  }

  private async checkWSLAudioEnvironment(): Promise<void> {
    // WSL環境かどうかチェック
    const isWSL = Deno.env.get("WSL_DISTRO_NAME") !== undefined;
    
    if (isWSL) {
      // WSLgのPulseAudioサーバーの設定を確認
      const pulseServer = Deno.env.get("PULSE_SERVER");
      
      if (!pulseServer) {
        console.warn("WSL環境でPULSE_SERVER環境変数が設定されていません");
        console.warn("WSLgが正しく設定されているか確認してください");
        
        // WSLgのデフォルト設定を試行
        Deno.env.set("PULSE_SERVER", "/mnt/wslg/PulseServer");
      }
      
      // WSLgのPulseServerソケットが存在するかチェック
      try {
        const pulseServerPath = pulseServer || "/mnt/wslg/PulseServer";
        await Deno.stat(pulseServerPath);
        console.log("WSLg PulseServer found:", pulseServerPath);
      } catch {
        console.warn("WSLg PulseServerが見つかりません。音声再生に問題が発生する可能性があります");
        console.warn("WSLを再起動してください: wsl --shutdown");
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

class ReadTextEngine {
  private voicevox: VoicevoxClient;
  private player: AudioPlayer;
  private config: VoicevoxConfig;

  constructor(config: VoicevoxConfig) {
    this.config = config;
    this.voicevox = new VoicevoxClient(config);
    this.player = new AudioPlayer(config);
  }

  async readText(text: string, speakerId?: number): Promise<void> {
    if (!text.trim()) {
      throw new Error("Empty text provided");
    }

    const lines = text.split('\n');
    if (lines.length > this.config.splitThreshold) {
      await this.readTextInChunks(lines, speakerId);
    } else {
      await this.readSingleText(text, speakerId);
    }
  }

  private async readTextInChunks(lines: string[], speakerId?: number): Promise<void> {
    for (let i = 0; i < lines.length; i += this.config.splitThreshold) {
      const chunk = lines.slice(i, i + this.config.splitThreshold).join('\n');
      if (chunk.trim()) {
        await this.readSingleText(chunk, speakerId);
      }
    }
  }

  private async readSingleText(text: string, speakerId?: number): Promise<void> {
    try {
      const audioBuffer = await this.voicevox.textToSpeech(text, speakerId);
      await this.player.playAudio(audioBuffer);
    } catch (error) {
      throw new Error(`Text-to-speech failed: ${error.message}`);
    }
  }
}

export async function main(denops: Denops): Promise<void> {
  async function getConfig(): Promise<VoicevoxConfig> {
    return {
      url: await vars.g.get(denops, "read_text_voicevox_url", "http://localhost:50021") as string,
      speakerId: await vars.g.get(denops, "read_text_speaker_id", 3) as number,
      speedScale: await vars.g.get(denops, "read_text_speed_scale", 1.0) as number,
      pitchScale: await vars.g.get(denops, "read_text_pitch_scale", 0.0) as number,
      tempDir: await vars.g.get(denops, "read_text_temp_dir", "./.tmp") as string,
      filePrefix: await vars.g.get(denops, "read_text_file_prefix", "vim_tts_") as string,
      autoCleanup: await vars.g.get(denops, "read_text_auto_cleanup", 1) as number === 1,
      audioBackend: await vars.g.get(denops, "read_text_audio_backend", "deno_audio") as string,
      splitThreshold: await vars.g.get(denops, "read_text_split_threshold", 50) as number,
    };
  }

  denops.dispatcher = {
    async readFromCursor(speakerId?: number): Promise<void> {
      try {
        const config = await getConfig();
        const engine = new ReadTextEngine(config);

        const [currentLine, lastLine] = await batch(denops, async (denops) => {
          const currentLine = await fn.line(denops, ".");
          const lastLine = await fn.line(denops, "$");
          return [currentLine, lastLine];
        });

        const lines = [];
        for (let i = currentLine; i <= lastLine; i++) {
          const line = await fn.getline(denops, i);
          lines.push(line);
        }

        const text = lines.join('\n');
        await engine.readText(text, speakerId);
      } catch (error) {
        console.error("ReadFromCursor failed:", error);
        await denops.cmd("echohl ErrorMsg | echo 'ReadFromCursor failed: " + error.message + "' | echohl None");
      }
    },

    async readSelection(speakerId?: number): Promise<void> {
      try {
        const config = await getConfig();
        const engine = new ReadTextEngine(config);

        const [startLine, endLine, startCol, endCol] = await collect(denops, (denops) => [
          fn.line(denops, "'<"),
          fn.line(denops, "'>"),
          fn.col(denops, "'<"),
          fn.col(denops, "'>")
        ]);

        let text = "";
        if (startLine === endLine) {
          const line = await fn.getline(denops, startLine);
          text = line.slice(startCol - 1, endCol);
        } else {
          const lines = [];
          for (let i = startLine; i <= endLine; i++) {
            const line = await fn.getline(denops, i);
            if (i === startLine) {
              lines.push(line.slice(startCol - 1));
            } else if (i === endLine) {
              lines.push(line.slice(0, endCol));
            } else {
              lines.push(line);
            }
          }
          text = lines.join('\n');
        }

        await engine.readText(text, speakerId);
      } catch (error) {
        console.error("ReadSelection failed:", error);
        await denops.cmd("echohl ErrorMsg | echo 'ReadSelection failed: " + error.message + "' | echohl None");
      }
    },

    async readLine(speakerId?: number): Promise<void> {
      try {
        const config = await getConfig();
        const engine = new ReadTextEngine(config);

        const text = await fn.getline(denops, ".");
        await engine.readText(text, speakerId);
      } catch (error) {
        console.error("ReadLine failed:", error);
        await denops.cmd("echohl ErrorMsg | echo 'ReadLine failed: " + error.message + "' | echohl None");
      }
    },

    async checkVoicevoxConnection(): Promise<boolean> {
      try {
        const config = await getConfig();
        const response = await fetch(`${config.url}/speakers`);
        return response.ok;
      } catch {
        return false;
      }
    },
  };

  await denops.cmd("augroup read_text_denops");
  await denops.cmd("autocmd!");
  await denops.cmd("augroup END");
}
