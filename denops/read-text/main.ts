import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import type { Config, ReadingRulesConfig } from "./types.ts";
import { ReadTextEngine } from "./engine.ts";
import { TextExtractor } from "./text_extractor.ts";

let currentEngine: ReadTextEngine | null = null;

export async function main(denops: Denops): Promise<void> {
  async function getConfig(): Promise<Config> {
    return {
      // TTS provider selection
      ttsProvider: await vars.g.get(denops, "read_text_tts_provider", "voicevox") as 'voicevox' | 'espeak' | 'melo' | 'kokoro',

      // VOICEVOX settings
      voicevoxUrl: await vars.g.get(denops, "read_text_voicevox_url", "http://localhost:50021") as string,
      voicevoxSpeaker: await vars.g.get(denops, "read_text_voicevox_speaker", 3) as number,

      // espeak settings
      espeakVoice: await vars.g.get(denops, "read_text_espeak_voice", "en") as string,
      espeakVariant: await vars.g.get(denops, "read_text_espeak_variant", "") as string,
      espeakCommand: await vars.g.get(denops, "read_text_espeak_command", "espeak") as string,

      // MeloTTS settings
      meloLanguage: await vars.g.get(denops, "read_text_melo_language", "EN") as string,
      meloSpeaker: await vars.g.get(denops, "read_text_melo_speaker", "EN-US") as string,
      meloDevice: await vars.g.get(denops, "read_text_melo_device", "auto") as string,
      meloPython: await vars.g.get(denops, "read_text_melo_python", "python3") as string,

      // kokoro-tts settings
      kokoroCommand: await vars.g.get(denops, "read_text_kokoro_command", "kokoro-tts") as string,
      kokoroModelPath: await vars.g.get(denops, "read_text_kokoro_model_path", "~/.local/share/kokoro-tts/kokoro-v1.0.onnx") as string,
      kokoroVoicesPath: await vars.g.get(denops, "read_text_kokoro_voices_path", "~/.local/share/kokoro-tts/voices-v1.0.bin") as string,
      kokoroLang: await vars.g.get(denops, "read_text_kokoro_lang", "en-us") as string,
      kokoroVoice: await vars.g.get(denops, "read_text_kokoro_voice", "af_sarah") as string,
      kokoroFormat: await vars.g.get(denops, "read_text_kokoro_format", "wav") as string,

      // Common settings
      speed: await vars.g.get(denops, "read_text_speed", 1.0) as number,
      pitch: await vars.g.get(denops, "read_text_pitch", 0.0) as number,

      // File management
      tempDir: await vars.g.get(denops, "read_text_temp_dir", "./.tmp") as string,
      filePrefix: await vars.g.get(denops, "read_text_file_prefix", "vim_tts_") as string,
      autoCleanup: await vars.g.get(denops, "read_text_auto_cleanup", 1) as number === 1,

      // Audio playback
      audioBackend: await vars.g.get(denops, "read_text_audio_backend", "aplay") as string,

      // Text processing
      splitThreshold: await vars.g.get(denops, "read_text_split_threshold", 50) as number,

      // Reading rules
      readingRulesEnabled: await vars.g.get(denops, "read_text_reading_rules_enabled", 1) as number === 1,
      readingRulesPresets: await vars.g.get(denops, "read_text_reading_rules_presets", ["latex"]) as string[],
      readingRulesMode: await vars.g.get(denops, "read_text_reading_rules_mode", "extend") as 'override' | 'extend',
    };
  }

  async function getReadingRulesConfig(): Promise<ReadingRulesConfig> {
    return {
      enabled: await vars.g.get(denops, "read_text_reading_rules_enabled", 1) as number === 1,
      presets: await vars.g.get(denops, "read_text_reading_rules_presets", ["latex"]) as string[],
      mode: await vars.g.get(denops, "read_text_reading_rules_mode", "extend") as 'override' | 'extend',
      customRules: [], // Custom rules can be added via API later
    };
  }

  const textExtractor = new TextExtractor(denops);

  denops.dispatcher = {
    async readFromCursor(speakerId?: number): Promise<void> {
      try {
        const config = await getConfig();
        currentEngine = new ReadTextEngine(config);

        // Configure reading rules parser
        const readingRulesConfig = await getReadingRulesConfig();
        textExtractor.setParserConfig(readingRulesConfig);

        const text = await textExtractor.extractFromCursor();

        // If speakerId is provided, use it as voice option
        const options = speakerId !== undefined ? { voice: speakerId.toString() } : undefined;

        await currentEngine.readText(text, options);
      } catch (error) {
        console.error("ReadFromCursor failed:", error);
        await denops.cmd("echohl ErrorMsg | echo 'ReadFromCursor failed: " + error.message + "' | echohl None");
      }
    },

    async readSelection(speakerId?: number): Promise<void> {
      try {
        const config = await getConfig();
        currentEngine = new ReadTextEngine(config);

        // Configure reading rules parser
        const readingRulesConfig = await getReadingRulesConfig();
        textExtractor.setParserConfig(readingRulesConfig);

        const text = await textExtractor.extractSelection();

        // If speakerId is provided, use it as voice option
        const options = speakerId !== undefined ? { voice: speakerId.toString() } : undefined;

        await currentEngine.readText(text, options);
      } catch (error) {
        console.error("ReadSelection failed:", error);
        await denops.cmd("echohl ErrorMsg | echo 'ReadSelection failed: " + error.message + "' | echohl None");
      }
    },

    async readLine(speakerId?: number): Promise<void> {
      try {
        const config = await getConfig();
        currentEngine = new ReadTextEngine(config);

        // Configure reading rules parser
        const readingRulesConfig = await getReadingRulesConfig();
        textExtractor.setParserConfig(readingRulesConfig);

        const text = await textExtractor.extractCurrentLine();

        // If speakerId is provided, use it as voice option
        const options = speakerId !== undefined ? { voice: speakerId.toString() } : undefined;

        await currentEngine.readText(text, options);
      } catch (error) {
        console.error("ReadLine failed:", error);
        await denops.cmd("echohl ErrorMsg | echo 'ReadLine failed: " + error.message + "' | echohl None");
      }
    },

    stopReading(): void {
      if (currentEngine) {
        currentEngine.stop();
      }
    },

    async checkVoicevoxConnection(): Promise<boolean> {
      try {
        const config = await getConfig();
        const engine = new ReadTextEngine(config);
        return await engine.checkConnection();
      } catch {
        return false;
      }
    },
  };

  await denops.cmd("augroup read_text_denops");
  await denops.cmd("autocmd!");
  await denops.cmd("augroup END");
}
