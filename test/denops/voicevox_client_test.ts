import { assertEquals, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

// テスト用のVOICEVOX設定
const TEST_VOICEVOX_URL = "https://hideously-cheerful-swift.ngrok-free.app";

// VoicevoxClientのテスト用インターface
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

// VoicevoxClientのテスト用実装
class VoicevoxClient {
  private config: VoicevoxConfig;

  constructor(config: VoicevoxConfig) {
    this.config = config;
  }

  async createAudioQuery(text: string, speakerId?: number): Promise<AudioQuery> {
    const sid = speakerId ?? this.config.speakerId;
    const response = await fetch(
      `${this.config.url}/audio_query?text=${encodeURIComponent(text)}&speaker=${sid}`,
      { 
        method: "POST",
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`VOICEVOX audio_query failed: ${response.statusText} - ${errorText}`);
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
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify(audioQuery),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`VOICEVOX synthesis failed: ${response.statusText} - ${errorText}`);
    }

    return await response.arrayBuffer();
  }

  async textToSpeech(text: string, speakerId?: number): Promise<ArrayBuffer> {
    const audioQuery = await this.createAudioQuery(text, speakerId);
    return await this.synthesize(audioQuery, speakerId);
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.url}/speakers`, {
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      if (response.ok) {
        await response.text(); // レスポンスボディを消費
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

describe("VoicevoxClient", () => {
  const config: VoicevoxConfig = {
    url: TEST_VOICEVOX_URL,
    speakerId: 3,
    speedScale: 1.0,
    pitchScale: 0.0,
    tempDir: "./.tmp",
    filePrefix: "test_",
    autoCleanup: true,
    audioBackend: "deno_audio",
    splitThreshold: 50,
  };

  it("should check VOICEVOX connection", async () => {
    const client = new VoicevoxClient(config);
    const isConnected = await client.checkConnection();
    assertEquals(isConnected, true, "VOICEVOX server should be accessible");
  });

  it("should create audio query for simple text", async () => {
    const client = new VoicevoxClient(config);
    const audioQuery = await client.createAudioQuery("こんにちは");
    
    // AudioQueryの基本構造をチェック
    assertEquals(typeof audioQuery.speedScale, "number");
    assertEquals(typeof audioQuery.pitchScale, "number");
    assertEquals(Array.isArray(audioQuery.accent_phrases), true);
    assertEquals(audioQuery.accent_phrases.length > 0, true);
  });

  it("should synthesize speech from audio query", async () => {
    const client = new VoicevoxClient(config);
    const audioQuery = await client.createAudioQuery("テスト");
    const audioBuffer = await client.synthesize(audioQuery);
    
    // 音声データが生成されていることを確認
    assertEquals(audioBuffer.byteLength > 0, true);
    assertEquals(audioBuffer instanceof ArrayBuffer, true);
  });

  it("should convert text to speech directly", async () => {
    const client = new VoicevoxClient(config);
    const audioBuffer = await client.textToSpeech("音声合成テスト");
    
    // 音声データが生成されていることを確認
    assertEquals(audioBuffer.byteLength > 0, true);
    assertEquals(audioBuffer instanceof ArrayBuffer, true);
  });

  it("should handle different speaker IDs", async () => {
    const client = new VoicevoxClient(config);
    
    // 異なる話者で音声生成
    const audioBuffer1 = await client.textToSpeech("話者テスト", 1);
    const audioBuffer2 = await client.textToSpeech("話者テスト", 14);
    
    // 両方とも音声データが生成されることを確認
    assertEquals(audioBuffer1.byteLength > 0, true);
    assertEquals(audioBuffer2.byteLength > 0, true);
  });

  it("should handle invalid speaker ID gracefully", async () => {
    const client = new VoicevoxClient(config);
    
    // 無効な話者IDでエラーが発生することを確認
    await assertRejects(
      () => client.textToSpeech("エラーテスト", 999),
      Error,
      "VOICEVOX"
    );
  });

  it("should handle empty text", async () => {
    const client = new VoicevoxClient(config);
    
    // 空文字列でも音声が生成されることを確認（VOICEVOXの仕様）
    const audioBuffer = await client.textToSpeech("");
    assertEquals(audioBuffer.byteLength > 0, true);
  });

  it("should respect speed and pitch settings", async () => {
    const customConfig = { ...config, speedScale: 1.5, pitchScale: 0.1 };
    const client = new VoicevoxClient(customConfig);
    
    const audioQuery = await client.createAudioQuery("速度とピッチのテスト");
    const audioBuffer = await client.synthesize(audioQuery);
    
    // 設定が反映されて音声が生成されることを確認
    assertEquals(audioBuffer.byteLength > 0, true);
    assertEquals(audioQuery.speedScale, 1.5);
    assertEquals(audioQuery.pitchScale, 0.1);
  });
});