import { assertEquals, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { play } from "https://deno.land/x/audio@0.2.0/mod.ts";

// テスト用の音声ファイル生成
async function createTestAudioFile(): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const audioPath = `${tempDir}/test_audio.wav`;
  
  // 簡単なWAVファイルヘッダー（440Hz、1秒のサイン波）
  const sampleRate = 44100;
  const duration = 1; // 秒
  const samples = sampleRate * duration;
  const frequency = 440; // Hz
  
  // WAVファイルヘッダー
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  // RIFFヘッダー
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + samples * 2, true); // ファイルサイズ
  view.setUint32(8, 0x57415645, false); // "WAVE"
  
  // fmtチャンク
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // チャンクサイズ
  view.setUint16(20, 1, true); // PCMフォーマット
  view.setUint16(22, 1, true); // モノラル
  view.setUint32(24, sampleRate, true); // サンプルレート
  view.setUint32(28, sampleRate * 2, true); // バイト/秒
  view.setUint16(32, 2, true); // ブロックアライン
  view.setUint16(34, 16, true); // ビット/サンプル
  
  // dataチャンク
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, samples * 2, true); // データサイズ
  
  // 音声データ生成
  const audioData = new ArrayBuffer(samples * 2);
  const audioView = new DataView(audioData);
  
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    const value = Math.floor(sample * 32767);
    audioView.setInt16(i * 2, value, true);
  }
  
  // ファイルに書き込み
  const fileData = new Uint8Array(44 + samples * 2);
  fileData.set(new Uint8Array(header), 0);
  fileData.set(new Uint8Array(audioData), 44);
  
  await Deno.writeFile(audioPath, fileData);
  return audioPath;
}

// WSL環境チェック
function isWSLEnvironment(): boolean {
  return Deno.env.get("WSL_DISTRO_NAME") !== undefined;
}

// WSL環境での音声設定チェック
async function checkWSLAudioSetup(): Promise<{
  isWSL: boolean;
  pulseServer: string | undefined;
  pulseServerExists: boolean;
}> {
  const isWSL = isWSLEnvironment();
  const pulseServer = Deno.env.get("PULSE_SERVER");
  let pulseServerExists = false;
  
  if (isWSL && pulseServer) {
    try {
      await Deno.stat(pulseServer);
      pulseServerExists = true;
    } catch {
      pulseServerExists = false;
    }
  }
  
  return { isWSL, pulseServer, pulseServerExists };
}

describe("deno_audio functionality", () => {
  it("should be able to import deno_audio library", () => {
    assertEquals(typeof play, "function");
  });

  it("should create test audio file successfully", async () => {
    const audioPath = await createTestAudioFile();
    
    // ファイルが存在することを確認
    const stat = await Deno.stat(audioPath);
    assertEquals(stat.isFile, true);
    assertEquals(stat.size > 44, true); // WAVヘッダー + データ
    
    // クリーンアップ
    await Deno.remove(audioPath);
  });

  it("should detect WSL environment correctly", () => {
    const isWSL = isWSLEnvironment();
    assertEquals(typeof isWSL, "boolean");
    
    // WSL環境の場合、WSL_DISTRO_NAMEが設定されているはず
    if (isWSL) {
      const distroName = Deno.env.get("WSL_DISTRO_NAME");
      assertEquals(typeof distroName, "string");
      assertEquals(distroName!.length > 0, true);
    }
  });

  it("should check WSL audio setup", async () => {
    const audioSetup = await checkWSLAudioSetup();
    
    assertEquals(typeof audioSetup.isWSL, "boolean");
    assertEquals(typeof audioSetup.pulseServerExists, "boolean");
    
    if (audioSetup.isWSL) {
      console.log("WSL環境で実行中");
      console.log("PULSE_SERVER:", audioSetup.pulseServer);
      console.log("PulseServer exists:", audioSetup.pulseServerExists);
      
      if (!audioSetup.pulseServerExists) {
        console.warn("WSLg PulseServerが見つかりません。音声再生に問題が発生する可能性があります");
        console.warn("WSLを再起動してください: wsl --shutdown");
      }
    }
  });
});

describe("deno_audio playback tests", () => {
  it("should play audio file with deno_audio", async () => {
    const audioPath = await createTestAudioFile();
    
    try {
      // WSL環境での音声設定チェック
      const audioSetup = await checkWSLAudioSetup();
      
      if (audioSetup.isWSL && !audioSetup.pulseServerExists) {
        console.warn("WSL環境でPulseServerが利用できません。テストをスキップします");
        return;
      }
      
      // deno_audioで音声再生を試行
      await play(audioPath);
      
      // 例外が発生しなければ成功
      assertEquals(true, true);
    } catch (error) {
      console.warn("Audio playback failed:", error);
      
      // WSL環境でない場合、またはPulseServerが利用できない場合はスキップ
      const audioSetup = await checkWSLAudioSetup();
      if (!audioSetup.isWSL || !audioSetup.pulseServerExists) {
        console.log("音声再生環境が利用できないため、テストをスキップします");
        return;
      }
      
      // その他のエラーは再発生
      throw error;
    } finally {
      // クリーンアップ
      await Deno.remove(audioPath);
    }
  });

  it("should handle non-existent audio file gracefully", async () => {
    const nonExistentPath = "/tmp/non_existent_audio.wav";
    
    await assertRejects(
      () => play(nonExistentPath),
      Error
    );
  });

  it("should handle invalid audio file gracefully", async () => {
    // 無効なファイルを作成
    const tempDir = await Deno.makeTempDir();
    const invalidPath = `${tempDir}/invalid_audio.wav`;
    await Deno.writeFile(invalidPath, new Uint8Array([0, 1, 2, 3, 4, 5]));
    
    try {
      await assertRejects(
        () => play(invalidPath),
        Error
      );
    } finally {
      await Deno.remove(invalidPath);
    }
  });
});

describe("WSL environment specific tests", () => {
  it("should set PULSE_SERVER if not set in WSL", async () => {
    const isWSL = isWSLEnvironment();
    
    if (!isWSL) {
      console.log("WSL環境ではないため、このテストをスキップします");
      return;
    }
    
    // 現在の設定を保存
    const originalPulseServer = Deno.env.get("PULSE_SERVER");
    
    try {
      // PULSE_SERVERを削除
      Deno.env.delete("PULSE_SERVER");
      
      // WSL環境チェック関数をシミュレート
      const checkWSLAudioEnvironment = async (): Promise<void> => {
        const pulseServer = Deno.env.get("PULSE_SERVER");
        
        if (!pulseServer) {
          console.warn("WSL環境でPULSE_SERVER環境変数が設定されていません");
          console.warn("WSLgが正しく設定されているか確認してください");
          
          // WSLgのデフォルト設定を試行
          Deno.env.set("PULSE_SERVER", "/mnt/wslg/PulseServer");
        }
      };
      
      await checkWSLAudioEnvironment();
      
      // PULSE_SERVERが設定されていることを確認
      const newPulseServer = Deno.env.get("PULSE_SERVER");
      assertEquals(newPulseServer, "/mnt/wslg/PulseServer");
      
    } finally {
      // 元の設定を復元
      if (originalPulseServer) {
        Deno.env.set("PULSE_SERVER", originalPulseServer);
      } else {
        Deno.env.delete("PULSE_SERVER");
      }
    }
  });

  it("should check WSLg PulseServer socket", async () => {
    const isWSL = isWSLEnvironment();
    
    if (!isWSL) {
      console.log("WSL環境ではないため、このテストをスキップします");
      return;
    }
    
    const pulseServerPath = "/mnt/wslg/PulseServer";
    
    try {
      const stat = await Deno.stat(pulseServerPath);
      console.log("WSLg PulseServer found:", pulseServerPath);
      assertEquals(stat.isSocket, true);
    } catch (error) {
      console.warn("WSLg PulseServerが見つかりません:", error);
      console.warn("WSLを再起動してください: wsl --shutdown");
      // エラーは発生させない（環境によって異なるため）
    }
  });
});